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
  type SecurityHandlers,
} from '@emmett-community/emmett-expressjs-with-openapi';
import type { Application } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { __setDependencies } from './handlers/shoppingCarts';
import type { ShoppingCartConfirmed } from './shoppingCarts/shoppingCart';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const eventStore = getInMemoryEventStore();
const messageBus = getInMemoryMessageBus();
const getUnitPrice = (_productId: string) => Promise.resolve(100);
const getCurrentTime = () => new Date();

__setDependencies(eventStore, messageBus, getUnitPrice, getCurrentTime);

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

const mapErrorToProblemDetails: ErrorToProblemDetailsMapping = (error) => {
  if (!(error instanceof IllegalStateError)) {
    return undefined; // Use default error handling
  }

  const message = error.message;

  // Shopping cart closed or insufficient quantity errors = 403 Forbidden
  if (
    message.includes('closed') ||
    message.includes('opened') ||
    message.includes('Not enough')
  ) {
    return {
      status: 403,
      title: 'Forbidden',
      detail: message,
      type: 'about:blank',
    } as any;
  }

  // Other IllegalStateError cases = 400 Bad Request
  return {
    status: 400,
    title: 'Bad Request',
    detail: message,
    type: 'about:blank',
  } as any;
};

export const app: Application = getApplication({
  apis: [],
  mapError: mapErrorToProblemDetails,
  openApiValidator: createOpenApiValidatorOptions(openApiFilePath, {
    validateRequests: true,
    validateResponses: process.env.NODE_ENV !== 'production',
    validateFormats: 'fast',
    serveSpec: '/api-docs/openapi.yml',
    validateSecurity: { handlers: securityHandlers },
    operationHandlers: path.join(__dirname, './handlers'),
  }),
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  startAPI(app, { port });
  console.log(`🚀 Shopping Cart API listening on http://localhost:${port}`);
  console.log('OpenAPI doc available at /api-docs/openapi.yml');
}
