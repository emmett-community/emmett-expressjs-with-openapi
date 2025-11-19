import {
  getInMemoryEventStore,
  getInMemoryMessageBus,
} from '@event-driven-io/emmett';
import {
  ApiE2ESpecification,
  createOpenApiValidatorOptions,
  expectResponse,
  getApplication,
  type TestRequest,
} from '@emmett-community/emmett-expressjs-with-openapi';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { before, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { __setDependencies } from '../handlers/shoppingCarts';
import type { ProductItem } from './shoppingCart';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

void describe('ShoppingCart e2e (OpenAPI)', () => {
  let clientId: string;
  let shoppingCartId: string;
  let given: ApiE2ESpecification;

  before(async () => {
    const eventStore = getInMemoryEventStore();
    const messageBus = getInMemoryMessageBus();
    const getUnitPrice = (_productId: string) => Promise.resolve(100);
    const getCurrentTime = () => new Date();

    __setDependencies(eventStore, messageBus, getUnitPrice, getCurrentTime);

    given = ApiE2ESpecification.for(
      () => eventStore,
      () =>
        getApplication({
          apis: [],
          openApiValidator: createOpenApiValidatorOptions(
            path.join(__dirname, '../../openapi.yml'),
            {
              validateRequests: true,
              validateSecurity: true,
              validateResponses: false,
              operationHandlers: path.join(__dirname, '../handlers'),
            },
          ),
        }),
    );
  });

  beforeEach(() => {
    clientId = randomUUID();
    shoppingCartId = `shopping_cart:${clientId}:current`;
  });

  const auth = (request: ReturnType<TestRequest>) =>
    request.set('Authorization', 'Bearer token-writer');

  void describe('When empty', () => {
    void it('adds product item', () => {
      return given()
        .when((request) =>
          auth(
            request
              .post(`/clients/${clientId}/shopping-carts/current/product-items`)
              .send(productItem),
          ),
        )
        .then([expectResponse(204)]);
    });

    void it('rejects invalid payload', () => {
      return given()
        .when((request) =>
          auth(
            request
              .post(`/clients/${clientId}/shopping-carts/current/product-items`)
              .send({ productId: 'test' }),
          ),
        )
        .then([expectResponse(400)]);
    });
  });

  void describe('When open', () => {
    const openedShoppingCart: TestRequest = (request) =>
      auth(
        request
          .post(`/clients/${clientId}/shopping-carts/current/product-items`)
          .send(productItem),
      );

    void it('confirms cart', () => {
      return given(openedShoppingCart)
        .when((request) =>
          auth(
            request.post(
              `/clients/${clientId}/shopping-carts/current/confirm`,
            ),
          ),
        )
        .then([expectResponse(204)]);
    });

    void it('cancels cart', () => {
      return given(openedShoppingCart)
        .when((request) =>
          auth(
            request.delete(`/clients/${clientId}/shopping-carts/current`),
          ),
        )
        .then([expectResponse(204)]);
    });

    void it('removes product', () => {
      return given(openedShoppingCart)
        .when((request) =>
          auth(
            request
              .delete(
                `/clients/${clientId}/shopping-carts/current/product-items`,
              )
              .query({
                productId: productItem.productId,
                quantity: productItem.quantity,
                unitPrice: 100,
              }),
          ),
        )
        .then([expectResponse(204)]);
    });
  });

  void describe('OpenAPI/ security errors', () => {
    void it('requires auth', () => {
      return given()
        .when((request) =>
          request
            .post(`/clients/${clientId}/shopping-carts/current/product-items`)
            .send(productItem),
        )
        .then([expectResponse(401)]);
    });

    void it('validates query parameters', () => {
      return given()
        .when((request) =>
          auth(
            request
              .delete(
                `/clients/${clientId}/shopping-carts/current/product-items`,
              )
              .query({ productId: 'test' }),
          ),
        )
        .then([expectResponse(400)]);
    });
  });

  const getRandomProduct = (): ProductItem => {
    return {
      productId: randomUUID(),
      quantity: Math.floor(Math.random() * 10) + 1,
    };
  };

  const productItem = getRandomProduct();
});
