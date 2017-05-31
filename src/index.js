import logger from 'winston';
import sqs from 'sqs';
import { createNamespace } from 'continuation-local-storage';
const userContext = createNamespace('audit');
export const setContext = context => {
  userContext.set('context', context);
};

export const getNamespace = () => userContext;

export default class SequelizeAudit {
  constructor(opts) {
    const defaultOptions = {
      awsAccessKey: process.env.AWS_ACCESS_KEY,
      awsSecretKey: process.env.AWS_SECRET_KEY,
      awsRegion: process.env.AWS_REGION,
    };
    // test
    const options = Object.assign({}, defaultOptions, opts);
    if (!options.connectionString) throw new Error('ConnectionString required');

    this.queueUrl = options.connectionString;
    this.sqs = sqs({
      access: options.awsAccessKey,
      secret: options.awsSecretKey,
      region: options.awsRegion,
    });

    this.audit = this.audit.bind(this);
    this.generateHooks = this.generateHooks.bind(this);
    this.buildLoggerPacket = this.buildLoggerPacket.bind(this);
  }
  audit(serviceName, type, model, options) {
    return this.sqs.push(
      'auditing',
      this.buildLoggerPacket(serviceName, type, model, options)
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
