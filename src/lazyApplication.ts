import type { Application, NextFunction, Request, Response } from 'express';

/**
 * Turns an application that is still being built into a request handler that can be used where
 * a ready Express application is expected.
 *
 * `getApplication` is asynchronous (it loads the OpenAPI document), while the test helpers of
 * `@event-driven-io/emmett-expressjs` (`ApiSpecification`, `ApiE2ESpecification`) take the
 * application synchronously and hand it to supertest. Wrapping the application with this function
 * lets both work together. Requests wait for the application; if it fails to build, the error
 * goes to the request through `next`, or the request is answered with 500 when it is served
 * without a `next` (as `http.createServer` and supertest do).
 *
 * The result only handles requests: it is not a full Express `Application` (no `use`, `get`, ...).
 *
 * @example
 * ```typescript
 * const given = ApiSpecification.for(
 *   () => getInMemoryEventStore(),
 *   (eventStore) => lazyApplication(getApplication({ apis: [shoppingCartApi(eventStore)] })),
 * );
 * ```
 */
export const lazyApplication = (
  building: Promise<Application>,
): Application => {
  // Avoids an unhandled rejection when the application fails and no request ever arrives
  building.catch(() => undefined);

  return ((request: Request, response: Response, next?: NextFunction) => {
    building.then(
      (app) => app(request, response, next as NextFunction),
      (error: unknown) => {
        if (next) {
          next(error);
          return;
        }

        response.statusCode = 500;
        response.end();
      },
    );
  }) as unknown as Application;
};
