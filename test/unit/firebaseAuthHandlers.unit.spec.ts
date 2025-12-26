import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createFirebaseAuthSecurityHandlers } from '../../src/openapi/firebase-auth';

let firebaseAvailable = true;
try {
  await import('@my-f-startup/firebase-auth-express');
} catch {
  firebaseAvailable = false;
}

const describeIf = firebaseAvailable ? describe : describe.skip;

void describeIf('Firebase Auth Security Handlers - Unit Tests', () => {
  const makeRequest = (token?: string) => ({
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

  const authClient = {
    verifyIdToken: async (token: string) => {
      if (token === 'invalid') {
        throw new Error('Invalid token');
      }
      if (token === 'missing-uid') {
        return {};
      }
      if (token === 'admin') {
        return { uid: 'admin-123', roles: ['admin'] };
      }
      return { uid: 'user-123', roles: ['user'] };
    },
  };

  void it('authenticates and populates req.auth when token is valid', async () => {
    const handlers = createFirebaseAuthSecurityHandlers({ authClient });
    const req = makeRequest('user');

    const result = await handlers.bearerAuth(req as any, [], {});

    assert.strictEqual(result, true);
    assert.strictEqual((req as any).auth?.uid, 'user-123');
  });

  void it('rejects when Authorization header is missing', async () => {
    const handlers = createFirebaseAuthSecurityHandlers({ authClient });
    const req = makeRequest();

    const result = await handlers.bearerAuth(req as any, [], {});

    assert.strictEqual(result, false);
  });

  void it('rejects when token does not include a uid', async () => {
    const handlers = createFirebaseAuthSecurityHandlers({ authClient });
    const req = makeRequest('missing-uid');

    const result = await handlers.bearerAuth(req as any, [], {});

    assert.strictEqual(result, false);
  });

  void it('checks role scopes against decoded token roles', async () => {
    const handlers = createFirebaseAuthSecurityHandlers({ authClient });
    const req = makeRequest('admin');

    const allowed = await handlers.bearerAuth(req as any, ['admin'], {});
    const denied = await handlers.bearerAuth(req as any, ['user'], {});

    assert.strictEqual(allowed, true);
    assert.strictEqual(denied, false);
  });

  void it('supports custom role claims', async () => {
    const handlers = createFirebaseAuthSecurityHandlers({
      authClient: {
        verifyIdToken: async () => ({
          uid: 'user-999',
          permissions: ['read'],
        }),
      },
      roleClaim: 'permissions',
    });
    const req = makeRequest('custom');

    const result = await handlers.bearerAuth(req as any, ['read'], {});

    assert.strictEqual(result, true);
  });
});
