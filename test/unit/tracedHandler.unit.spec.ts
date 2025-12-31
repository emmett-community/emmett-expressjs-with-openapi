import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import type { Request, Response, NextFunction } from 'express';
import { tracedOn, OK } from '../../src/handler';

void describe('tracedOn - Unit Tests', () => {
  const createMockRequest = (overrides: Partial<Request> = {}) =>
    ({
      method: 'GET',
      path: '/test',
      baseUrl: '',
      route: { path: '/test' },
      ...overrides,
    }) as unknown as Request;

  const createMockResponse = () => {
    const res = {
      statusCode: 200,
      send: mock.fn(),
      sendStatus: mock.fn((code: number) => {
        res.statusCode = code;
      }),
      setHeader: mock.fn(),
    };
    return res as unknown as Response;
  };

  void it('should execute handler and set response', async () => {
    const handler = tracedOn(async () => OK({ body: { success: true } }));

    const req = createMockRequest();
    const res = createMockResponse();
    const next = mock.fn() as unknown as NextFunction;

    await handler(req, res, next);

    assert.strictEqual(res.statusCode, 200);
  });

  void it('should propagate errors from handler', async () => {
    const testError = new Error('Handler failed');
    const handler = tracedOn(async () => {
      throw testError;
    });

    const req = createMockRequest();
    const res = createMockResponse();
    const next = mock.fn() as unknown as NextFunction;

    await assert.rejects(() => handler(req, res, next), testError);
  });

  void it('should work with synchronous handlers', async () => {
    const handler = tracedOn(() => OK({ body: { sync: true } }));

    const req = createMockRequest();
    const res = createMockResponse();
    const next = mock.fn() as unknown as NextFunction;

    await handler(req, res, next);

    assert.strictEqual(res.statusCode, 200);
  });

  void it('should use custom span name when provided', async () => {
    const handler = tracedOn(async () => OK(), {
      spanName: 'custom.span.name',
    });

    const req = createMockRequest();
    const res = createMockResponse();
    const next = mock.fn() as unknown as NextFunction;

    // Should not throw - span name is used internally
    await handler(req, res, next);

    assert.strictEqual(res.statusCode, 200);
  });

  void it('should handle request with baseUrl', async () => {
    const handler = tracedOn(async () => OK());

    const req = createMockRequest({
      baseUrl: '/api/v1',
      path: '/carts',
      route: { path: '/carts' } as any,
    });
    const res = createMockResponse();
    const next = mock.fn() as unknown as NextFunction;

    await handler(req, res, next);

    assert.strictEqual(res.statusCode, 200);
  });

  void it('should handle POST requests', async () => {
    const handler = tracedOn(async () => OK({ body: { created: true } }));

    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();
    const next = mock.fn() as unknown as NextFunction;

    await handler(req, res, next);

    assert.strictEqual(res.statusCode, 200);
  });

  void it('should handle different status codes', async () => {
    const handler = tracedOn(async (_req: Request) => {
      return (response: Response) => {
        response.statusCode = 404;
        response.send({ error: 'Not found' });
      };
    });

    const req = createMockRequest();
    const res = createMockResponse();
    const next = mock.fn() as unknown as NextFunction;

    await handler(req, res, next);

    assert.strictEqual(res.statusCode, 404);
  });

  void it('should work without route property on request', async () => {
    const handler = tracedOn(async () => OK());

    const req = createMockRequest({ route: undefined });
    const res = createMockResponse();
    const next = mock.fn() as unknown as NextFunction;

    // Should not throw when route is undefined
    await handler(req, res, next);

    assert.strictEqual(res.statusCode, 200);
  });
});
