import logger from 'winston';
import Producer from 'sqs-producer';
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
    };
    // test
    const options = Object.assign({}, defaultOptions, opts);
    if (!options.queueUrl) throw new Error('QueueUrl required');

    this.producer = Producer.create({
      queueUrl: options.queueUrl,
      region: options.awsRegion,
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

    return {
      timestamp: new Date().toISOString(),
      type,
      entityId: model.id,
      previousValues: model._previousDataValues,
      currentValues: model.dataValues,
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
