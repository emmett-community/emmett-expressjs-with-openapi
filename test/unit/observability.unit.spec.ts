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

    void it('should call logger.debug when provided', () => {
      const debugFn = mock.fn();
      const logger: Logger = { debug: debugFn };

      safeLog.debug(logger, 'debug message', { data: 1 });

      assert.strictEqual(debugFn.mock.calls.length, 1);
      assert.deepStrictEqual(debugFn.mock.calls[0].arguments, [
        'debug message',
        { data: 1 },
      ]);
    });

    void it('should call logger.info when provided', () => {
      const infoFn = mock.fn();
      const logger: Logger = { info: infoFn };

      safeLog.info(logger, 'info message', { data: 2 });

      assert.strictEqual(infoFn.mock.calls.length, 1);
      assert.deepStrictEqual(infoFn.mock.calls[0].arguments, [
        'info message',
        { data: 2 },
      ]);
    });

    void it('should call logger.warn when provided', () => {
      const warnFn = mock.fn();
      const logger: Logger = { warn: warnFn };

      safeLog.warn(logger, 'warn message', { data: 3 });

      assert.strictEqual(warnFn.mock.calls.length, 1);
      assert.deepStrictEqual(warnFn.mock.calls[0].arguments, [
        'warn message',
        { data: 3 },
      ]);
    });

    void it('should call logger.error when provided', () => {
      const errorFn = mock.fn();
      const logger: Logger = { error: errorFn };
      const testError = new Error('test error');

      safeLog.error(logger, 'error message', testError);

      assert.strictEqual(errorFn.mock.calls.length, 1);
      assert.deepStrictEqual(errorFn.mock.calls[0].arguments, [
        'error message',
        testError,
      ]);
    });

    void it('should handle partial logger implementations', () => {
      const warnFn = mock.fn();
      const partialLogger: Logger = {
        warn: warnFn,
        // debug, info, error not provided
      };

      assert.doesNotThrow(() => {
        safeLog.debug(partialLogger, 'debug msg');
        safeLog.info(partialLogger, 'info msg');
        safeLog.warn(partialLogger, 'warn msg');
        safeLog.error(partialLogger, 'error msg');
      });

      // Only warn should have been called
      assert.strictEqual(warnFn.mock.calls.length, 1);
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
