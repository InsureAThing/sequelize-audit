const mockPush = jest.fn();
jest.mock('sqs', () => {
  return () => ({
    push: mockPush,
  });
});
import SequelizeAudit, { getNamespace, setContext } from './index';

describe('Sequelize Audit tests', () => {
  const testModel = {
    id: 'Hello',
    _previousValues: {
      id: 'Was Hello',
    },
    dataValues: {
      id: 'Hello',
    },
    fields: ['id'],
    $modelOptions: {
      name: {
        singular: 'Test',
      },
    },
  };

  const defaultOptions = {
    connectionString: 'sqs-connection',
    awsAccessKey: 'mock',
    awsSecretKey: 'mock-secret',
  };

  describe('SQS init', () => {
    it('init connectionString required', () => {
      expect(() => new SequelizeAudit()).toThrow();
    });
    it('sets up sqs with options', () => {
      const audit = new SequelizeAudit(defaultOptions);
      expect(audit.sqs).toBeDefined();
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
  it('afterUpdate calls audit function', () => {
    const audit = new SequelizeAudit(defaultOptions);
    const hooks = audit.generateHooks('testService');
    hooks.afterUpdate(testModel, {});
    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][1]).toMatchObject({
      service: 'testService',
      type: 'update',
    });
  });

  it('afterCreate calls audit function', () => {
    const audit = new SequelizeAudit(defaultOptions);
    const hooks = audit.generateHooks('testService');
    hooks.afterCreate(testModel, {});
    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][1]).toMatchObject({
      service: 'testService',
      type: 'create',
    });
  });

  it('afterDelete calls audit function', () => {
    const audit = new SequelizeAudit(defaultOptions);
    const hooks = audit.generateHooks('testService');
    hooks.afterDelete(testModel, {});
    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][1]).toMatchObject({
      service: 'testService',
      type: 'delete',
    });
  });

  it('Gets user from context', () => {
    const ns = getNamespace();
    expect.assertions(2);
    ns.run(() => {
      const audit = new SequelizeAudit(defaultOptions);
      setContext({ id: '1234' });
      const hooks = audit.generateHooks('testService');
      hooks.afterUpdate(testModel, {});
      expect(mockPush).toHaveBeenCalled();
      expect(mockPush.mock.calls[0][1]).toMatchObject({
        service: 'testService',
        userId: '1234',
      });
    });
  });
});
