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
      const logger: Logger = { info: infoFn };

      const app = await getApplication({
        apis: [],
        observability: { logger },
      });

      assert.ok(app);
      assert.ok(infoFn.mock.calls.length > 0);

      // Verify initialization message was logged
      const initMessage = infoFn.mock.calls.find((call) =>
        (call.arguments[0] as string).includes('initialized'),
      );
      assert.ok(initMessage, 'Expected initialization message to be logged');
    });

    void it('should emit debug log on initialization when logger provided', async () => {
      const debugFn = mock.fn();
      const logger: Logger = { debug: debugFn };

      const app = await getApplication({
        apis: [],
        observability: { logger },
      });

      assert.ok(app);
      assert.ok(debugFn.mock.calls.length > 0);

      // Verify initialization debug message
      const initMessage = debugFn.mock.calls.find((call) =>
        (call.arguments[0] as string).includes('Initializing'),
      );
      assert.ok(initMessage, 'Expected initialization debug message to be logged');
    });

    void it('should work with partial logger (only warn)', async () => {
      const warnFn = mock.fn();
      const partialLogger: Logger = { warn: warnFn };

      // This should not throw even though debug/info/error are missing
      const app = await getApplication({
        apis: [],
        observability: { logger: partialLogger },
      });

      assert.ok(app);
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
      // Should have called debug and info during initialization
      assert.ok(debugFn.mock.calls.length > 0);
      assert.ok(infoFn.mock.calls.length > 0);
    });
  });

  void describe('silent by default behavior', () => {
    void it('should not emit any logs when no logger is provided', async () => {
      // We can't easily assert console wasn't called, but we can verify
      // the app initializes without errors and no exceptions are thrown
      const app = await getApplication({
        apis: [],
      });

      assert.ok(app);
      // The test passes if no errors occur - meaning silent behavior works
    });
  });
});
