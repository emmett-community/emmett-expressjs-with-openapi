import { trace, SpanStatusCode } from '@opentelemetry/api';
import express, {
  Router,
  type Application,
  type RequestHandler,
} from 'express';
import 'express-async-errors';
import http from 'http';
import { createRequire } from 'node:module';
import { problemDetailsMiddleware } from './middlewares/problemDetailsMiddleware';
import { type Logger, type ObservabilityOptions, safeLog } from './observability';
import type { OpenApiValidatorOptions } from './openapi';
import type { ErrorToProblemDetailsMapping } from './responses';

const tracer = trace.getTracer('@emmett-community/emmett-expressjs-with-openapi');

/**
 * Helper function to build pino-http options from environment variables.
 * Environment variables are only used when pinoHttp option is not explicitly provided.
 *
 * @see https://github.com/pinojs/pino-http
 */
function buildPinoHttpOptionsFromEnv(): boolean | PinoHttpOptions | undefined {
  // Check if LOG_HTTP_ENABLED is explicitly set
  const logHttpEnabled = process.env.LOG_HTTP_ENABLED;
  if (logHttpEnabled === undefined) {
    return undefined; // Use default behavior (not set)
  }

  // If LOG_HTTP_ENABLED is explicitly false, disable logging
  if (logHttpEnabled === 'false' || logHttpEnabled === '0') {
    return false;
  }

  // If LOG_HTTP_ENABLED is true, build options
  if (logHttpEnabled === 'true' || logHttpEnabled === '1') {
    const options: PinoHttpOptions = {};

    // Check PINO_HTTP_AUTO_LOGGING env var
    const autoLogging = process.env.PINO_HTTP_AUTO_LOGGING;
    if (autoLogging !== undefined) {
      options.autoLogging =
        autoLogging !== 'false' && autoLogging !== '0';
    }

    // Return true if no custom options, otherwise return the options object
    return Object.keys(options).length === 0 ? true : options;
  }

  // Invalid value, return undefined
  return undefined;
}

// #region web-api-setup
export type WebApiSetup = (router: Router) => void;
// #endregion web-api-setup

/**
 * Options forwarded to pino-http. Typed loosely to avoid hard dependency.
 *
 * @see https://github.com/pinojs/pino-http
 */
export type PinoHttpOptions = Record<string, unknown>;

export type ApplicationOptions = {
  apis?: WebApiSetup[];
  mapError?: ErrorToProblemDetailsMapping;
  enableDefaultExpressEtag?: boolean;
  disableJsonMiddleware?: boolean;
  disableUrlEncodingMiddleware?: boolean;
  disableProblemDetailsMiddleware?: boolean;
  /**
   * Optional Pino HTTP logger configuration.
   * When true, enables pino-http with defaults.
   * When an object, forwards the options to pino-http.
   * When undefined/false, can be controlled via LOG_HTTP_ENABLED environment variable.
   * Requires the 'pino-http' package to be installed.
   *
   * Options passed here take precedence over environment variables.
   *
   * Environment variables:
   * - LOG_HTTP_ENABLED: Set to 'true' to enable HTTP logging (default: undefined)
   * - PINO_HTTP_AUTO_LOGGING: Set to 'false' to disable automatic request/response logging (default: 'true')
   *
   * @see https://github.com/pinojs/pino-http
   * @example
   * ```typescript
   * // Option 1: Enable via code
   * const app = await getApplication({
   *   pinoHttp: true,
   * });
   *
   * // Option 2: Enable via environment variable
   * // export LOG_HTTP_ENABLED=true
   * const app = await getApplication({});
   *
   * // Option 3: Custom configuration via code
   * const app = await getApplication({
   *   pinoHttp: { autoLogging: false },
   * });
   *
   * // Option 4: Customize via environment variables
   * // export LOG_HTTP_ENABLED=true
   * // export PINO_HTTP_AUTO_LOGGING=false
   * const app = await getApplication({});
   * ```
   */
  pinoHttp?: boolean | PinoHttpOptions;
  /**
   * Optional OpenAPI validator configuration.
   * When provided, enables request/response validation against an OpenAPI specification.
   * Requires the 'express-openapi-validator' package to be installed.
   *
   * @see https://github.com/cdimascio/express-openapi-validator
   * @example
   * ```typescript
   * import { getApplication, createOpenApiValidatorOptions } from '@event-driven-io/emmett-expressjs';
   *
   * type AppDeps = {
   *   eventStore: EventStore;
   *   messageBus: EventsPublisher;
   * };
   *
   * const app = await getApplication({
   *   openApiValidator: createOpenApiValidatorOptions<AppDeps>('./openapi.yaml', {
   *     validateResponses: true,
   *     operationHandlers: './handlers',
   *     initializeHandlers: (deps) => {
   *       initializeHandlers(deps.eventStore, deps.messageBus);
   *     }
   *   })
   * });
   * ```
   */
  openApiValidator?: OpenApiValidatorOptions;
  /**
   * Optional observability configuration for logging.
   * When not provided, the library operates silently (no logs).
   *
   * @example
   * ```typescript
   * import pino from 'pino';
   *
   * const logger = pino();
   *
   * const app = await getApplication({
   *   observability: { logger },
   * });
   * ```
   */
  observability?: ObservabilityOptions;
};

export const getApplication = async (options: ApplicationOptions) => {
  const app: Application = express();

  const {
    apis,
    mapError,
    enableDefaultExpressEtag,
    disableJsonMiddleware,
    disableUrlEncodingMiddleware,
    disableProblemDetailsMiddleware,
    pinoHttp: pinoHttpOption,
    openApiValidator,
    observability,
  } = options;

  const logger = observability?.logger;

  // Resolve pinoHttp: explicit option takes precedence over env vars
  const pinoHttp = pinoHttpOption !== undefined ? pinoHttpOption : buildPinoHttpOptionsFromEnv();

  safeLog.debug(logger, 'Initializing Express application', {
    hasApis: !!apis?.length,
    hasOpenApiValidator: !!openApiValidator,
    hasPinoHttp: !!pinoHttp,
  });

  const router = Router();

  // disabling default etag behaviour
  // to use etags in if-match and if-not-match headers
  app.set('etag', enableDefaultExpressEtag ?? false);

  // add Pino HTTP logger middleware if configured
  if (pinoHttp !== undefined && pinoHttp !== false) {
    try {
      const require = createRequire(import.meta.url);
      const mod = require('pino-http') as Record<string, unknown>;
      const provider = (mod.default ?? mod) as unknown;

      if (typeof provider !== 'function') {
        throw new Error('Invalid pino-http module: missing default export');
      }

      const opts = pinoHttp === true ? undefined : pinoHttp;
      const middleware = (
        provider as (opts?: PinoHttpOptions) => RequestHandler
      )(opts);
      app.use(middleware);
    } catch (error) {
      safeLog.warn(
        logger,
        'Pino HTTP configuration provided but pino-http package is not installed. Install it with: npm install pino-http',
      );
      throw new Error(
        'pino-http package is required when pinoHttp option is used',
      );
    }
  }

  // add json middleware
  if (!disableJsonMiddleware) app.use(express.json());

  // enable url encoded urls and bodies
  if (!disableUrlEncodingMiddleware)
    app.use(
      express.urlencoded({
        extended: true,
      }),
    );

  // add OpenAPI validator middleware if configured
  if (openApiValidator) {
    // Activate ESM resolver if operationHandlers are configured
    // This ensures handler modules are loaded via ESM import() instead of CJS require(),
    // preventing dual module loading issues when using TypeScript runtimes (tsx, ts-node)
    if (openApiValidator.operationHandlers) {
      const { activateESMResolver } = await import(
        './internal/esm-resolver.js'
      );
      activateESMResolver();

      // NEW: Auto-discover and import handler modules from OpenAPI spec
      const handlersBasePath =
        typeof openApiValidator.operationHandlers === 'string'
          ? openApiValidator.operationHandlers
          : openApiValidator.operationHandlers.basePath;

      if (handlersBasePath) {
        const { extractHandlerModules } = await import(
          './internal/openapi-parser.js'
        );
        const { importAndRegisterHandlers } = await import(
          './internal/handler-importer.js'
        );

        // Parse OpenAPI spec to find handler modules
        const modules = await tracer.startActiveSpan(
          'emmett.openapi.parse_spec',
          async (span) => {
            try {
              const result = await extractHandlerModules(
                openApiValidator.apiSpec,
                handlersBasePath,
                logger,
              );
              span.setAttribute('emmett.handlers.count', result.length);
              span.setStatus({ code: SpanStatusCode.OK });
              return result;
            } catch (error) {
              span.recordException(error as Error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              throw error;
            } finally {
              span.end();
            }
          },
        );

        // Dynamically import and register all handler modules
        const importedHandlers = await tracer.startActiveSpan(
          'emmett.http.import_handlers',
          async (span) => {
            try {
              const result = await importAndRegisterHandlers(modules, logger);
              span.setAttribute(
                'emmett.handlers.count',
                Object.keys(result).length,
              );
              span.setStatus({ code: SpanStatusCode.OK });
              return result;
            } catch (error) {
              safeLog.error(logger, 'Failed to auto-import handler modules', error);
              span.recordException(error as Error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              throw error;
            } finally {
              span.end();
            }
          },
        );

        // Call user's initializeHandlers callback with imported modules
        if (openApiValidator.initializeHandlers) {
          await openApiValidator.initializeHandlers(importedHandlers);
        }
      }
    } else {
      // No operationHandlers, just call initializeHandlers if provided
      if (openApiValidator.initializeHandlers) {
        await openApiValidator.initializeHandlers();
      }
    }

    try {
      const require = createRequire(import.meta.url);
      // express-openapi-validator exports a default with .middleware (ESM/CJS compatibility)
      const mod = require('express-openapi-validator') as Record<
        string,
        unknown
      >;
      const provider = (mod.default ?? mod) as Record<string, unknown>;

      if (typeof provider.middleware !== 'function') {
        throw new Error(
          'Invalid express-openapi-validator module: missing middleware export',
        );
      }

      // Serve OpenAPI spec if configured
      if (openApiValidator.serveSpec) {
        if (typeof openApiValidator.apiSpec === 'string') {
          // If apiSpec is a file path, serve it as a static file
          app.use(
            openApiValidator.serveSpec,
            express.static(openApiValidator.apiSpec),
          );
        } else {
          // If apiSpec is an object, serve it as JSON
          app.get(openApiValidator.serveSpec, (_req, res) => {
            res.json(openApiValidator.apiSpec);
          });
        }
      }

      const factory = provider.middleware as (
        opts: OpenApiValidatorOptions,
      ) => RequestHandler | RequestHandler[];
      const middleware = factory(openApiValidator);
      if (Array.isArray(middleware)) {
        for (const m of middleware) app.use(m);
      } else {
        app.use(middleware);
      }
    } catch (error) {
      safeLog.warn(
        logger,
        'OpenAPI validator configuration provided but express-openapi-validator package is not installed. Install it with: npm install express-openapi-validator',
      );
      throw new Error(
        'express-openapi-validator package is required when openApiValidator option is used',
      );
    }
  }

  // Register API routes if provided
  if (apis) {
    for (const api of apis) {
      api(router);
    }
    app.use(router);
  }

  // add problem details middleware
  if (!disableProblemDetailsMiddleware)
    app.use(problemDetailsMiddleware(mapError, logger));

  safeLog.info(logger, 'Express application initialized');

  return app;
};

export type StartApiOptions = {
  port?: number;
  /**
   * Optional logger for lifecycle events.
   */
  logger?: Logger;
};

export const startAPI = (
  app: Application,
  options: StartApiOptions = { port: 3000 },
) => {
  const { port, logger } = options;
  const server = http.createServer(app);

  server.on('listening', () => {
    safeLog.info(logger, 'Server up listening', { port });
  });

  return server.listen(port);
};
