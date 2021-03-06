const mockPush = jest.fn();
jest.mock('sqs-producer', () => {
  return {
    create: () => ({
      send: mockPush,
    }),
  };
});
import SequelizeAudit, { getNamespace, setContext } from './index';

describe('Sequelize Audit tests', () => {
  const testModel = {
    id: 'Hello',
    _previousDataValues: {
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
    queueUrl: 'sqs-connection',
  };

  describe('SQS init', () => {
    it('sets up sqs with options', () => {
      const audit = new SequelizeAudit(defaultOptions);
      expect(audit.producer).toBeDefined();
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
    expect(mockPush.mock.calls[0][0]).toContainEqual(
      expect.objectContaining({
        id: 'testService_update',
      })
    );
  });

  it('afterCreate calls audit function', () => {
    const audit = new SequelizeAudit(defaultOptions);
    const hooks = audit.generateHooks('testService');
    hooks.afterCreate(testModel, {});
    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContainEqual(
      expect.objectContaining({
        id: 'testService_create',
      })
    );
  });

  it('afterDelete calls audit function', () => {
    const audit = new SequelizeAudit(defaultOptions);
    const hooks = audit.generateHooks('testService');
    hooks.afterDelete(testModel, {});
    expect(mockPush).toHaveBeenCalled();
    expect(mockPush.mock.calls[0][0]).toContainEqual(
      expect.objectContaining({
        id: 'testService_delete',
      })
    );
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
      expect(mockPush.mock.calls[0][0]).toContainEqual(
        expect.objectContaining({
          id: 'testService_update',
          body: expect.stringMatching(`"userId":"1234"`),
        })
      );
    });
  });
});
