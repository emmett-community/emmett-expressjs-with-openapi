/**
 * Operation handlers invoked by express-openapi-validator.
 * Function names must match the OpenAPI operationId.
 */

import {
  CommandHandler,
  assertNotEmptyString,
  assertPositiveNumber,
  getInMemoryEventStore,
  getInMemoryMessageBus,
  type EventStore,
  type EventsPublisher,
} from '@event-driven-io/emmett';
import type { Request } from 'express';
import { on, NoContent } from '@emmett-community/emmett-expressjs-with-openapi';
import {
  addProductItem as addProductItemCommand,
  cancel,
  confirm,
  removeProductItem as removeProductItemCommand,
  type AddProductItemToShoppingCart,
  type CancelShoppingCart,
  type ConfirmShoppingCart,
  type RemoveProductItemFromShoppingCart,
} from '../shoppingCarts/businessLogic';
import {
  ShoppingCartId,
  evolve,
  initialState,
} from '../shoppingCarts/shoppingCart';

export const handle = CommandHandler({ evolve, initialState });

type ShoppingCartDependencies = {
  eventStore: EventStore;
  messageBus: EventsPublisher;
  getUnitPrice: (_productId: string) => Promise<number>;
  getCurrentTime: () => Date;
};

const depsKey = Symbol.for(
  'emmett.examples.shoppingCart.dependencies',
);

const getDeps = (): ShoppingCartDependencies => {
  const globalTarget = globalThis as typeof globalThis & {
    [depsKey]?: ShoppingCartDependencies;
  };

  if (!globalTarget[depsKey]) {
    globalTarget[depsKey] = {
      eventStore: getInMemoryEventStore(),
      messageBus: getInMemoryMessageBus(),
      getUnitPrice: (_productId: string) => Promise.resolve(100),
      getCurrentTime: () => new Date(),
    };
  }

  return globalTarget[depsKey]!;
};

export const __setDependencies = (
  newEventStore: EventStore,
  newMessageBus?: EventsPublisher,
  newGetUnitPrice?: (_productId: string) => Promise<number>,
  newGetCurrentTime?: () => Date,
) => {
  const deps = getDeps();
  deps.eventStore = newEventStore;
  if (newMessageBus) deps.messageBus = newMessageBus;
  if (newGetUnitPrice) deps.getUnitPrice = newGetUnitPrice;
  if (newGetCurrentTime) deps.getCurrentTime = newGetCurrentTime;
};

// POST /clients/{clientId}/shopping-carts/current/product-items
export const addProductItem = on(async (request: Request) => {
  const { eventStore, getUnitPrice, getCurrentTime } = getDeps();
  const clientId = assertNotEmptyString(request.params.clientId);
  const shoppingCartId = ShoppingCartId(clientId);
  const productId = assertNotEmptyString(request.body.productId);

  const command: AddProductItemToShoppingCart = {
    type: 'AddProductItemToShoppingCart',
    data: {
      shoppingCartId,
      clientId,
      productItem: {
        productId,
        quantity: assertPositiveNumber(request.body.quantity),
        unitPrice: await getUnitPrice(productId),
      },
    },
    metadata: { clientId, now: getCurrentTime() },
  };

  await handle(eventStore, shoppingCartId, (state) =>
    addProductItemCommand(command, state),
  );

  return NoContent();
});

// DELETE /clients/{clientId}/shopping-carts/current/product-items
export const removeProductItem = on(async (request: Request) => {
  const { eventStore, getCurrentTime } = getDeps();
  const clientId = assertNotEmptyString(request.params.clientId);
  const shoppingCartId = ShoppingCartId(clientId);

  const command: RemoveProductItemFromShoppingCart = {
    type: 'RemoveProductItemFromShoppingCart',
    data: {
      shoppingCartId,
      productItem: {
        productId: assertNotEmptyString(request.query.productId),
        quantity: assertPositiveNumber(Number(request.query.quantity)),
        unitPrice: assertPositiveNumber(Number(request.query.unitPrice)),
      },
    },
    metadata: { clientId, now: getCurrentTime() },
  };

  await handle(eventStore, shoppingCartId, (state) =>
    removeProductItemCommand(command, state),
  );

  return NoContent();
});

// POST /clients/{clientId}/shopping-carts/current/confirm
export const confirmShoppingCart = on(async (request: Request) => {
  const { eventStore, messageBus, getCurrentTime } = getDeps();
  const clientId = assertNotEmptyString(request.params.clientId);
  const shoppingCartId = ShoppingCartId(clientId);

  const command: ConfirmShoppingCart = {
    type: 'ConfirmShoppingCart',
    data: { shoppingCartId },
    metadata: { clientId, now: getCurrentTime() },
  };

  const {
    newEvents: [confirmed, ..._rest],
  } = await handle(eventStore, shoppingCartId, (state) =>
    confirm(command, state),
  );

  await messageBus.publish(confirmed);

  return NoContent();
});

// DELETE /clients/{clientId}/shopping-carts/current
export const cancelShoppingCart = on(async (request: Request) => {
  const { eventStore, getCurrentTime } = getDeps();
  const clientId = assertNotEmptyString(request.params.clientId);
  const shoppingCartId = ShoppingCartId(clientId);

  const command: CancelShoppingCart = {
    type: 'CancelShoppingCart',
    data: { shoppingCartId },
    metadata: { clientId, now: getCurrentTime() },
  };

  await handle(eventStore, shoppingCartId, (state) =>
    cancel(command, state),
  );

  return NoContent();
});
