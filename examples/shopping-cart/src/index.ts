import {
  getInMemoryEventStore,
  getInMemoryMessageBus,
  IllegalStateError,
} from '@event-driven-io/emmett';
import {
  createOpenApiValidatorOptions,
  getApplication,
  startAPI,
  type ErrorToProblemDetailsMapping,
  type ImportedHandlerModules,
  type SecurityHandlers,
} from '@emmett-community/emmett-expressjs-with-openapi';
import type { Application } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ShoppingCartError } from './shoppingCarts/businessLogic';
import type { ShoppingCartConfirmed } from './shoppingCarts/shoppingCart';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventStore = getInMemoryEventStore();
const messageBus = getInMemoryMessageBus();
const getUnitPrice = (_productId: string) => Promise.resolve(100);
const getCurrentTime = () => new Date();
const isProduction = process.env.NODE_ENV === 'production';

messageBus.subscribe((event: ShoppingCartConfirmed) => {
  if (event.type === 'ShoppingCartConfirmed') {
    console.info(
      `Shopping cart confirmed: ${event.data.shoppingCartId} at ${event.data.confirmedAt.toISOString()}`,
    );
  }
}, 'ShoppingCartConfirmed');

const users = new Map([
  ['token-writer', { id: 'writer', scopes: ['cart:write'] }],
  [
    'token-admin',
    { id: 'admin', scopes: ['cart:write', 'cart:read', 'admin'] },
  ],
]);

const securityHandlers: SecurityHandlers = {
  bearerAuth: async (req, scopes) => {
    const authHeader = req.headers.authorization as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) return false;

    const token = authHeader.substring('Bearer '.length);
    const user = users.get(token);
    if (!user) return false;

    req.user = user;

    if (scopes.length === 0) return true;

    return scopes.every((scope) => user.scopes.includes(scope));
  },
};

const openApiFilePath = path.join(__dirname, '../openapi.yml');

const errorStatusMap: Record<string, number> = {
  [ShoppingCartError.CART_CLOSED]: 403,
  [ShoppingCartError.CART_NOT_OPENED]: 403,
  [ShoppingCartError.INSUFFICIENT_QUANTITY]: 403,
  [ShoppingCartError.CART_ALREADY_EXISTS]: 409,
  [ShoppingCartError.CART_EMPTY]: 400,
};

const mapErrorToProblemDetails: ErrorToProblemDetailsMapping = (error) => {
  if (!(error instanceof IllegalStateError)) {
    return undefined; // Use default error handling
  }

  const statusCode = errorStatusMap[error.message] ?? 500;

  return {
    status: statusCode,
    title:
      statusCode === 403
        ? 'Forbidden'
        : statusCode === 409
          ? 'Conflict'
          : 'Bad Request',
    detail: error.message,
    type: 'about:blank',
  } as any;
};

export const app: Application = await getApplication({
  mapError: mapErrorToProblemDetails,
  pinoHttp: isProduction
    ? true
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      },
  openApiValidator: createOpenApiValidatorOptions(openApiFilePath, {
      validateRequests: true,
      validateResponses: !isProduction,
      validateFormats: 'fast',
      serveSpec: '/api-docs/openapi.yml',
      validateSecurity: { handlers: securityHandlers },
      operationHandlers: path.join(__dirname, './handlers'),
      initializeHandlers: async (handlers?: ImportedHandlerModules) => {
        // Framework auto-imports handler modules!
        handlers!.shoppingCarts.initializeHandlers(eventStore, messageBus, getUnitPrice, getCurrentTime);
      },
    },
  ),
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  startAPI(app, { port });
  console.log(`🚀 Shopping Cart API listening on http://localhost:${port}`);
  console.log('OpenAPI doc available at /api-docs/openapi.yml');
}
