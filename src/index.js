import logger from 'winston';
import Producer from 'sqs-producer';
import AWS from 'aws-sdk';
import { diff } from 'deep-diff';
import { createNamespace } from 'continuation-local-storage';

const userContext = createNamespace('audit');
export const setContext = context => {
  userContext.set('context', context);
};

export const getNamespace = () => userContext;

export default class SequelizeAudit {
  constructor(opts) {
    const defaultOptions = {
      queueUrl: process.env.SQS_QUEUE_URL,
      awsRegion: process.env.AWS_REGION,
      awsAccessKey: process.env.AWS_ACCESS_KEY,
      awsSecretKey: process.env.AWS_SECRET_KEY,
    };
    // test
    const options = Object.assign({}, defaultOptions, opts);
    if (!options.queueUrl) throw new Error('QueueUrl required');

    AWS.config.update({
      region: options.awsRegion,
      accessKeyId: options.awsAccessKey,
      secretAccessKey: options.awsSecretKey,
    });

    this.producer = Producer.create({
      queueUrl: options.queueUrl,
      region: options.awsRegion,
      sqs: new AWS.SQS(),
    });

    this.audit = this.audit.bind(this);
    this.generateHooks = this.generateHooks.bind(this);
    this.buildLoggerPacket = this.buildLoggerPacket.bind(this);
  }
  audit(serviceName, type, model, options) {
    return this.producer.send(
      [
        {
          id: `${serviceName}_${type}`,
          body: JSON.stringify(
            this.buildLoggerPacket(serviceName, type, model, options)
          ),
        },
      ],
      err => {
        if (err) logger.error(err);
      }
    );
  }
  buildLoggerPacket(serviceName, type, model, options) {
    const user = userContext.get('context');

    const deepDiff = diff(model._previousValues, model.dataValues);

    return {
      timestamp: new Date().toISOString(),
      type,
      entityId: model.id,
      difference: deepDiff,
      fields: options.fields,
      service: serviceName,
      entity: model.$modelOptions.name.singular,
      userId: user ? user.id : null,
    };
  }
  generateHooks(serviceName) {
    return {
      afterUpdate: (model, options) => {
        return this.audit(serviceName, 'update', model, options);
      },
      afterCreate: (model, options) => {
        return this.audit(serviceName, 'create', model, options);
      },
      afterDelete: (model, options) => {
        return this.audit(serviceName, 'delete', model, options);
      },
    };
  }
}
