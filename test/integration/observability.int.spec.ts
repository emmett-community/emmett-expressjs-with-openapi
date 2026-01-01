import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { getApplication, type Logger } from '../../src';

void describe('Observability - Integration Tests', () => {
  void describe('getApplication without logger', () => {
    void it('should initialize successfully without observability options', async () => {
      const app = await getApplication({
        apis: [],
      });

      assert.ok(app);
    });

    void it('should initialize successfully with empty observability options', async () => {
      const app = await getApplication({
        apis: [],
        observability: {},
      });

      assert.ok(app);
    });
  });

  void describe('getApplication with logger', () => {
    void it('should emit info log on initialization when logger provided', async () => {
      const infoFn = mock.fn();
      const logger: Logger = {
        debug: mock.fn(),
        info: infoFn,
        warn: mock.fn(),
        error: mock.fn(),
      };

      const app = await getApplication({
        apis: [],
        observability: { logger },
      });

      assert.ok(app);
      assert.ok(infoFn.mock.calls.length > 0);

      // Verify (context, message) contract: message is second argument
      const initCall = infoFn.mock.calls.find(
        (call) =>
          (call.arguments[1] as string | undefined)?.includes('initialized'),
      );
      assert.ok(initCall, 'Expected initialization message to be logged');
    });

    void it('should emit debug log on initialization when logger provided', async () => {
      const debugFn = mock.fn();
      const logger: Logger = {
        debug: debugFn,
        info: mock.fn(),
        warn: mock.fn(),
        error: mock.fn(),
      };

      const app = await getApplication({
        apis: [],
        observability: { logger },
      });

      assert.ok(app);
      assert.ok(debugFn.mock.calls.length > 0);

      // Verify (context, message) contract: message is second argument
      const initMessage = debugFn.mock.calls.find(
        (call) =>
          (call.arguments[1] as string | undefined)?.includes('Initializing'),
      );
      assert.ok(
        initMessage,
        'Expected initialization debug message to be logged',
      );
    });

    void it('should pass context as first argument (new contract)', async () => {
      const debugFn = mock.fn();
      const logger: Logger = {
        debug: debugFn,
        info: mock.fn(),
        warn: mock.fn(),
        error: mock.fn(),
      };

      await getApplication({
        apis: [],
        observability: { logger },
      });

      // Verify that context (object) is first argument
      const [firstArg, secondArg] = debugFn.mock.calls[0].arguments as [
        unknown,
        unknown,
      ];
      assert.strictEqual(
        typeof firstArg,
        'object',
        'First argument should be context object',
      );
      assert.strictEqual(
        typeof secondArg,
        'string',
        'Second argument should be message string',
      );
    });

    void it('should work with full logger implementation', async () => {
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

      const app = await getApplication({
        apis: [],
        observability: { logger: fullLogger },
      });

      assert.ok(app);
      assert.ok(debugFn.mock.calls.length > 0);
      assert.ok(infoFn.mock.calls.length > 0);
    });
  });

  void describe('silent by default behavior', () => {
    void it('should not emit any logs when no logger is provided', async () => {
      const app = await getApplication({
        apis: [],
      });

      assert.ok(app);
    });
  });
});
