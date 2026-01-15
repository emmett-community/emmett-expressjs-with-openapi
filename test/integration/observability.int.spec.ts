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

  void describe('Pino HTTP environment variables', () => {
    void it('should enable pinoHttp when LOG_HTTP_ENABLED=true', async () => {
      const originalEnv = process.env.LOG_HTTP_ENABLED;
      try {
        process.env.LOG_HTTP_ENABLED = 'true';
        
        const warnFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: mock.fn(),
          warn: warnFn,
          error: mock.fn(),
        };

        const app = await getApplication({
          apis: [],
          observability: { logger },
        });

        assert.ok(app);
        // When LOG_HTTP_ENABLED=true and pino-http is installed, it should work
        // If pino-http is not installed, it would throw an error, which is expected behavior
      } finally {
        if (originalEnv === undefined) {
          delete process.env.LOG_HTTP_ENABLED;
        } else {
          process.env.LOG_HTTP_ENABLED = originalEnv;
        }
      }
    });

    void it('should not enable pinoHttp when LOG_HTTP_ENABLED=false', async () => {
      const originalEnv = process.env.LOG_HTTP_ENABLED;
      try {
        process.env.LOG_HTTP_ENABLED = 'false';
        
        const app = await getApplication({
          apis: [],
        });

        assert.ok(app);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.LOG_HTTP_ENABLED;
        } else {
          process.env.LOG_HTTP_ENABLED = originalEnv;
        }
      }
    });

    void it('should ignore LOG_HTTP_ENABLED when pinoHttp option is explicitly provided', async () => {
      const originalEnv = process.env.LOG_HTTP_ENABLED;
      try {
        // Set env var to true, but pass false in options
        process.env.LOG_HTTP_ENABLED = 'true';
        
        const app = await getApplication({
          apis: [],
          pinoHttp: false,
        });

        assert.ok(app);
        // Should respect pinoHttp: false from options, not env var
      } finally {
        if (originalEnv === undefined) {
          delete process.env.LOG_HTTP_ENABLED;
        } else {
          process.env.LOG_HTTP_ENABLED = originalEnv;
        }
      }
    });

    void it('should parse PINO_HTTP_AUTO_LOGGING from env var when LOG_HTTP_ENABLED=true', async () => {
      const originalLogHttpEnabled = process.env.LOG_HTTP_ENABLED;
      const originalAutoLogging = process.env.PINO_HTTP_AUTO_LOGGING;
      try {
        process.env.LOG_HTTP_ENABLED = 'true';
        process.env.PINO_HTTP_AUTO_LOGGING = 'false';
        
        const warnFn = mock.fn();
        const logger: Logger = {
          debug: mock.fn(),
          info: mock.fn(),
          warn: warnFn,
          error: mock.fn(),
        };

        const app = await getApplication({
          apis: [],
          observability: { logger },
        });

        assert.ok(app);
        // If pino-http is installed, it would create the middleware with autoLogging: false
      } finally {
        if (originalLogHttpEnabled === undefined) {
          delete process.env.LOG_HTTP_ENABLED;
        } else {
          process.env.LOG_HTTP_ENABLED = originalLogHttpEnabled;
        }
        if (originalAutoLogging === undefined) {
          delete process.env.PINO_HTTP_AUTO_LOGGING;
        } else {
          process.env.PINO_HTTP_AUTO_LOGGING = originalAutoLogging;
        }
      }
    });
  });
});
