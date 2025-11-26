import express, {
  Router,
  type Application,
  type RequestHandler,
} from 'express';
import 'express-async-errors';
import http from 'http';
import { createRequire } from 'node:module';
import { problemDetailsMiddleware } from './middlewares/problemDetailsMiddleware';
import type { OpenApiValidatorOptions } from './openapi';
import type { ErrorToProblemDetailsMapping } from './responses';

// #region web-api-setup
export type WebApiSetup = (router: Router) => void;
// #endregion web-api-setup

export type ApplicationOptions = {
  apis?: WebApiSetup[];
  mapError?: ErrorToProblemDetailsMapping;
  enableDefaultExpressEtag?: boolean;
  disableJsonMiddleware?: boolean;
  disableUrlEncodingMiddleware?: boolean;
  disableProblemDetailsMiddleware?: boolean;
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
    openApiValidator,
  } = options;

  const router = Router();

  // disabling default etag behaviour
  // to use etags in if-match and if-not-match headers
  app.set('etag', enableDefaultExpressEtag ?? false);

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

        try {
          // Parse OpenAPI spec to find handler modules
          const modules = await extractHandlerModules(
            openApiValidator.apiSpec,
            handlersBasePath,
          );

          // Dynamically import and register all handler modules
          const importedHandlers = await importAndRegisterHandlers(modules);

          // Call user's initializeHandlers callback with imported modules
          if (openApiValidator.initializeHandlers) {
            await openApiValidator.initializeHandlers(importedHandlers);
          }
        } catch (error) {
          console.error('Failed to auto-import handler modules:', error);
          throw error;
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
    } catch {
      console.warn(
        'OpenAPI validator configuration provided but express-openapi-validator package is not installed. ' +
          'Install it with: npm install express-openapi-validator',
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
    app.use(problemDetailsMiddleware(mapError));

  return app;
};

export type StartApiOptions = {
  port?: number;
};

export const startAPI = (
  app: Application,
  options: StartApiOptions = { port: 3000 },
) => {
  const { port } = options;
  const server = http.createServer(app);

  server.on('listening', () => {
    console.info('server up listening');
  });

  return server.listen(port);
};
