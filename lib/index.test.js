'use strict';

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var mockPush = jest.fn();
jest.mock('sqs-producer', function () {
  return {
    create: function create() {
      return {
        send: mockPush
      };
    }
  };
});


describe('Sequelize Audit tests', function () {
  var testModel = {
    id: 'Hello',
    _previousValues: {
      id: 'Was Hello'
    },
    dataValues: {
      id: 'Hello'
    },
    fields: ['id'],
    $modelOptions: {
      name: {
        singular: 'Test'
      }
    }
  };

  var defaultOptions = {
    queueUrl: 'sqs-connection',
    awsAccessKey: 'mock',
    awsSecretKey: 'mock-secret'
  };

  describe('SQS init', function () {
    it('sets up sqs with options', function () {
      var audit = new _index2.default(defaultOptions);
      expect(audit.producer).toBeDefined();
    });
  });

  afterEach(function () {
    jest.resetAllMocks();
  });
  it('afterUpdate calls audit function', function () {
    var audit = new _index2.default(defaultOptions);
    var hooks = audit.generateHooks('testService');
    hooks.afterUpdate(testModel, {});
    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContainEqual(expect.objectContaining({
      id: 'testService_update'
    }));
  });

  it('afterCreate calls audit function', function () {
    var audit = new _index2.default(defaultOptions);
    var hooks = audit.generateHooks('testService');
    hooks.afterCreate(testModel, {});
    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContainEqual(expect.objectContaining({
      id: 'testService_create'
    }));
  });

  it('afterDelete calls audit function', function () {
    var audit = new _index2.default(defaultOptions);
    var hooks = audit.generateHooks('testService');
    hooks.afterDelete(testModel, {});
    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContainEqual(expect.objectContaining({
      id: 'testService_delete'
    }));
  });

  it('Gets user from context', function () {
    var ns = (0, _index.getNamespace)();
    expect.assertions(2);
    ns.run(function () {
      var audit = new _index2.default(defaultOptions);
      (0, _index.setContext)({ id: '1234' });
      var hooks = audit.generateHooks('testService');
      hooks.afterUpdate(testModel, {});
      expect(mockPush).toHaveBeenCalled();
      expect(mockPush.mock.calls[0][0]).toContainEqual(expect.objectContaining({
        id: 'testService_update',
        body: expect.stringMatching('"userId":"1234"')
      }));
    });
  });
});