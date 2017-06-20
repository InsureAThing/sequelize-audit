'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getNamespace = exports.setContext = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _sqsProducer = require('sqs-producer');

var _sqsProducer2 = _interopRequireDefault(_sqsProducer);

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _deepDiff = require('deep-diff');

var _continuationLocalStorage = require('continuation-local-storage');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var userContext = (0, _continuationLocalStorage.createNamespace)('audit');
var setContext = exports.setContext = function setContext(context) {
  userContext.set('context', context);
};

var getNamespace = exports.getNamespace = function getNamespace() {
  return userContext;
};

var SequelizeAudit = function () {
  function SequelizeAudit(opts) {
    _classCallCheck(this, SequelizeAudit);

    var defaultOptions = {
      queueUrl: process.env.SQS_QUEUE_URL,
      awsRegion: process.env.AWS_REGION || opts.region,
      awsAccessKey: process.env.AWS_ACCESS_KEY,
      awsSecretKey: process.env.AWS_SECRET_KEY
    };
    // test
    var options = Object.assign({}, defaultOptions, opts);
    if (!options.queueUrl) throw new Error('QueueUrl required');

    _awsSdk2.default.config.update({
      region: options.awsRegion,
      accessKeyId: options.awsAccessKey,
      secretAccessKey: options.awsSecretKey
    });

    this.producer = _sqsProducer2.default.create({
      queueUrl: options.queueUrl,
      region: options.awsRegion,
      sqs: new _awsSdk2.default.SQS()
    });

    this.audit = this.audit.bind(this);
    this.generateHooks = this.generateHooks.bind(this);
    this.buildLoggerPacket = this.buildLoggerPacket.bind(this);
  }

  _createClass(SequelizeAudit, [{
    key: 'audit',
    value: function audit(serviceName, type, model, options) {
      return this.producer.send([{
        id: serviceName + '_' + type,
        body: JSON.stringify(this.buildLoggerPacket(serviceName, type, model, options))
      }], function (err) {
        if (err) _winston2.default.error(err);
      });
    }
  }, {
    key: 'buildLoggerPacket',
    value: function buildLoggerPacket(serviceName, type, model, options) {
      var user = userContext.get('context');

      var previousValues = JSON.parse(JSON.stringify(model._previousDataValues));
      var currentValues = JSON.parse(JSON.stringify(model.dataValues));
      var deepDiff = (0, _deepDiff.diff)(previousValues || {}, currentValues || {});

      return {
        timestamp: new Date().toISOString(),
        type: type,
        entityId: model.id,
        difference: deepDiff,
        fields: model._changed ? Object.keys(model._changed) : options.fields,
        service: serviceName,
        entity: model.$modelOptions.name.singular,
        userId: user ? user.id : null
      };
    }
  }, {
    key: 'generateHooks',
    value: function generateHooks(serviceName) {
      var _this = this;

      return {
        afterUpdate: function afterUpdate(model, options) {
          return _this.audit(serviceName, 'update', model, options);
        },
        afterCreate: function afterCreate(model, options) {
          return _this.audit(serviceName, 'create', model, options);
        },
        afterDelete: function afterDelete(model, options) {
          return _this.audit(serviceName, 'delete', model, options);
        }
      };
    }
  }]);

  return SequelizeAudit;
}();

exports.default = SequelizeAudit;