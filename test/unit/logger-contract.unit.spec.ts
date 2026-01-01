import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { safeLog, type Logger } from '../../src/observability';

/**
 * Contract Compliance Tests
 *
 * These tests validate that the Logger contract is correctly implemented
 * and that safeLog properly translates internal calls to the canonical format.
 *
 * The tests verify:
 * 1. Injected loggers receive (context, message) - NOT (message, data)
 * 2. Context is always first parameter
 * 3. Message is always second parameter
 * 4. Both Pino-compatible and custom loggers work correctly
 */
void describe('Logger Contract Compliance', () => {
  void describe('canonical (context, message) contract', () => {
    void it('should receive structured object as FIRST parameter', () => {
      const infoFn = mock.fn();
      const logger: Logger = {
        debug: mock.fn(),
        info: infoFn,
        warn: mock.fn(),
        error: mock.fn(),
      };

      safeLog.info(logger, 'Order created', { orderId: 123, status: 'pending' });

      const [context] = infoFn.mock.calls[0].arguments as [
        Record<string, unknown>,
      ];

      // Context MUST be the first parameter
      assert.strictEqual(typeof context, 'object');
      assert.strictEqual(context.orderId, 123);
      assert.strictEqual(context.status, 'pending');
    });

    void it('should receive message string as SECOND parameter', () => {
      const infoFn = mock.fn();
      const logger: Logger = {
        debug: mock.fn(),
        info: infoFn,
        warn: mock.fn(),
        error: mock.fn(),
      };

      safeLog.info(logger, 'Order created', { orderId: 123 });

      const [, message] = infoFn.mock.calls[0].arguments as [
        Record<string, unknown>,
        string,
      ];

      // Message MUST be the second parameter
      assert.strictEqual(message, 'Order created');
    });

    void it('should NEVER pass message as first parameter', () => {
      const infoFn = mock.fn();
      const logger: Logger = {
        debug: mock.fn(),
        info: infoFn,
        warn: mock.fn(),
        error: mock.fn(),
      };

      safeLog.info(logger, 'This is a message', { key: 'value' });

      const [firstArg] = infoFn.mock.calls[0].arguments as [unknown];

      // First argument must NOT be a string
      assert.notStrictEqual(typeof firstArg, 'string');
      // First argument MUST be an object
      assert.strictEqual(typeof firstArg, 'object');
    });
  });

  void describe('Pino-compatible logger', () => {
    void it('should work with Pino-style logger (context, message)', () => {
      // Simulates how Pino would receive the call
      const calls: Array<{
        context: Record<string, unknown>;
        message?: string;
      }> = [];

      const pinoStyleLogger: Logger = {
        debug(context, message) {
          calls.push({ context, message });
        },
        info(context, message) {
          calls.push({ context, message });
        },
        warn(context, message) {
          calls.push({ context, message });
        },
        error(context, message) {
          calls.push({ context, message });
        },
      };

      safeLog.info(pinoStyleLogger, 'Request received', {
        method: 'POST',
        path: '/api/orders',
      });

      assert.strictEqual(calls.length, 1);
      assert.deepStrictEqual(calls[0].context, {
        method: 'POST',
        path: '/api/orders',
      });
      assert.strictEqual(calls[0].message, 'Request received');
    });
  });

  void describe('Winston-compatible adapter (DEMONSTRATIVE ONLY)', () => {
    /**
     * NOTE: This adapter is for demonstration purposes only.
     * It is NOT part of the public API and NOT an official recommendation.
     * Users must implement their own adapters for non-Pino loggers.
     */
    void it('should work with Winston-style adapter that inverts parameters', () => {
      // Winston uses (message, context) internally, so an adapter inverts
      const winstonCalls: Array<{
        level: string;
        message: string;
        meta: Record<string, unknown>;
      }> = [];

      // Simulated Winston logger
      const fakeWinston = {
        log(level: string, message: string, meta: Record<string, unknown>) {
          winstonCalls.push({ level, message, meta });
        },
      };

      // Winston adapter that implements our Logger contract
      const winstonAdapter: Logger = {
        debug(context, message) {
          fakeWinston.log('debug', message ?? '', context);
        },
        info(context, message) {
          fakeWinston.log('info', message ?? '', context);
        },
        warn(context, message) {
          fakeWinston.log('warn', message ?? '', context);
        },
        error(context, message) {
          fakeWinston.log('error', message ?? '', context);
        },
      };

      safeLog.info(winstonAdapter, 'User logged in', { userId: 'abc123' });

      assert.strictEqual(winstonCalls.length, 1);
      assert.strictEqual(winstonCalls[0].level, 'info');
      assert.strictEqual(winstonCalls[0].message, 'User logged in');
      assert.deepStrictEqual(winstonCalls[0].meta, { userId: 'abc123' });
    });
  });

  void describe('error handling with err key', () => {
    void it('should wrap Error instances in err key for Pino compatibility', () => {
      const errorFn = mock.fn();
      const logger: Logger = {
        debug: mock.fn(),
        info: mock.fn(),
        warn: mock.fn(),
        error: errorFn,
      };

      const testError = new Error('Connection failed');
      safeLog.error(logger, 'Database error', testError);

      const [context, message] = errorFn.mock.calls[0].arguments as [
        Record<string, unknown>,
        string,
      ];

      assert.strictEqual(message, 'Database error');
      assert.ok(context.err instanceof Error);
      assert.strictEqual((context.err as Error).message, 'Connection failed');
    });
  });

  void describe('contract validation - OLD code would FAIL these tests', () => {
    /**
     * This test explicitly documents what the OLD implementation did
     * and verifies that the NEW implementation does NOT do this.
     *
     * OLD behavior: logger.info('message', { data })
     * NEW behavior: logger.info({ data }, 'message')
     */
    void it('should NOT call logger with (string, object) signature', () => {
      const infoFn = mock.fn();
      const logger: Logger = {
        debug: mock.fn(),
        info: infoFn,
        warn: mock.fn(),
        error: mock.fn(),
      };

      safeLog.info(logger, 'Test message', { key: 'value' });

      const [firstArg, secondArg] = infoFn.mock.calls[0].arguments as [
        unknown,
        unknown,
      ];

      // This would be true with OLD code, but MUST be false with NEW code
      const isOldFormat =
        typeof firstArg === 'string' && typeof secondArg === 'object';
      assert.strictEqual(
        isOldFormat,
        false,
        'Should NOT use old (string, object) format',
      );

      // This MUST be true with NEW code
      const isNewFormat =
        typeof firstArg === 'object' && typeof secondArg === 'string';
      assert.strictEqual(
        isNewFormat,
        true,
        'MUST use new (object, string) format',
      );
    });
  });
});
