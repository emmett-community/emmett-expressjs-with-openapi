import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { safeLog, type Logger } from '../../src/observability';

void describe('Observability - Unit Tests', () => {
  void describe('safeLog', () => {
    void it('should not throw when logger is undefined', () => {
      assert.doesNotThrow(() => {
        safeLog.debug(undefined, 'test message');
        safeLog.info(undefined, 'test message');
        safeLog.warn(undefined, 'test message');
        safeLog.error(undefined, 'test message');
      });
    });

    void it('should not throw when logger is undefined with data', () => {
      assert.doesNotThrow(() => {
        safeLog.debug(undefined, 'test message', { key: 'value' });
        safeLog.info(undefined, 'test message', { key: 'value' });
        safeLog.warn(undefined, 'test message', { key: 'value' });
        safeLog.error(undefined, 'test message', new Error('test'));
      });
    });

    void describe('translates to (context, message) contract', () => {
      void it('should call logger.debug with (context, message)', () => {
        const debugFn = mock.fn();
        const logger: Logger = {
          debug: debugFn,
          info: mock.fn(),
          warn: mock.fn(),
          error: mock.fn(),
        };

        safeLog.debug(logger, 'debug message', { data: 1 });

        assert.strictEqual(debugFn.mock.calls.length, 1);
        // Verify NEW contract: (context, message)
        assert.deepStrictEqual(debugFn.mock.calls[0].arguments, [
          { data: 1 }, // context first
          'debug message', // message second
        ]);
      });

      void it('should call logger.info with (context, message)', () => {
        const infoFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: infoFn,
          warn: mock.fn(),
          error: mock.fn(),
        };

        safeLog.info(logger, 'info message', { data: 2 });

        assert.strictEqual(infoFn.mock.calls.length, 1);
        assert.deepStrictEqual(infoFn.mock.calls[0].arguments, [
          { data: 2 },
          'info message',
        ]);
      });

      void it('should call logger.warn with (context, message) for plain objects', () => {
        const warnFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: mock.fn(),
          warn: warnFn,
          error: mock.fn(),
        };

        safeLog.warn(logger, 'warn message', { data: 3 });

        assert.strictEqual(warnFn.mock.calls.length, 1);
        assert.deepStrictEqual(warnFn.mock.calls[0].arguments, [
          { data: 3 },
          'warn message',
        ]);
      });

      void it('should call logger.warn with (context, message) and err key for Error', () => {
        const warnFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: mock.fn(),
          warn: warnFn,
          error: mock.fn(),
        };
        const testError = new Error('test error');
        (testError as unknown as Record<string, unknown>).name = 'Unauthorized';
        (testError as unknown as Record<string, unknown>).status = 401;

        safeLog.warn(logger, 'warn message', testError);

        assert.strictEqual(warnFn.mock.calls.length, 1);
        const [context, message] = warnFn.mock.calls[0].arguments as [
          Record<string, unknown>,
          string,
        ];
        assert.strictEqual(message, 'warn message');
        // Error is wrapped in { err: Error } - NOT spread
        assert.ok(context.err instanceof Error);
        assert.strictEqual((context.err as Error).message, 'test error');
        // Should NOT have error properties spread to context
        assert.strictEqual(context.name, undefined);
        assert.strictEqual(context.status, undefined);
      });

      void it('should call logger.error with (context, message) and err key for Error', () => {
        const errorFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: mock.fn(),
          warn: mock.fn(),
          error: errorFn,
        };
        const testError = new Error('test error');

        safeLog.error(logger, 'error message', testError);

        assert.strictEqual(errorFn.mock.calls.length, 1);
        // Error is wrapped in { err: Error } for Pino compatibility
        const [context, message] = errorFn.mock.calls[0].arguments as [
          Record<string, unknown>,
          string,
        ];
        assert.strictEqual(message, 'error message');
        assert.ok(context.err instanceof Error);
        assert.strictEqual((context.err as Error).message, 'test error');
      });
    });

    void describe('normalizes data to context object', () => {
      void it('should pass empty object when data is undefined', () => {
        const infoFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: infoFn,
          warn: mock.fn(),
          error: mock.fn(),
        };

        safeLog.info(logger, 'message without data');

        assert.deepStrictEqual(infoFn.mock.calls[0].arguments, [
          {}, // empty context
          'message without data',
        ]);
      });

      void it('should wrap primitives in data key', () => {
        const infoFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: infoFn,
          warn: mock.fn(),
          error: mock.fn(),
        };

        safeLog.info(logger, 'message with primitive', 42 as unknown);

        assert.deepStrictEqual(infoFn.mock.calls[0].arguments, [
          { data: 42 },
          'message with primitive',
        ]);
      });

      void it('should wrap arrays in data key', () => {
        const infoFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: infoFn,
          warn: mock.fn(),
          error: mock.fn(),
        };

        safeLog.info(logger, 'message with array', [1, 2, 3] as unknown);

        assert.deepStrictEqual(infoFn.mock.calls[0].arguments, [
          { data: [1, 2, 3] },
          'message with array',
        ]);
      });

      void it('should not mutate the original data object', () => {
        const infoFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: infoFn,
          warn: mock.fn(),
          error: mock.fn(),
        };

        const originalData = { key: 'value', nested: { a: 1 } };
        const originalDataCopy = { ...originalData };

        safeLog.info(logger, 'message', originalData);

        // Original object should remain unchanged
        assert.deepStrictEqual(originalData, originalDataCopy);
      });
    });

    void it('should work with a full logger implementation', () => {
      const debugFn = mock.fn();
      const infoFn = mock.fn();
      const warnFn = mock.fn();
      const errorFn = mock.fn();

      const fullLogger: Logger = {
        debug: debugFn,
        info: infoFn,
        warn: warnFn,
        error: errorFn,
      };

      safeLog.debug(fullLogger, 'debug');
      safeLog.info(fullLogger, 'info');
      safeLog.warn(fullLogger, 'warn');
      safeLog.error(fullLogger, 'error');

      assert.strictEqual(debugFn.mock.calls.length, 1);
      assert.strictEqual(infoFn.mock.calls.length, 1);
      assert.strictEqual(warnFn.mock.calls.length, 1);
      assert.strictEqual(errorFn.mock.calls.length, 1);
    });
  });
});
