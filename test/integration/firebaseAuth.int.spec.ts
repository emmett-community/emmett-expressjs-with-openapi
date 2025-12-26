import { getInMemoryEventStore } from '@event-driven-io/emmett';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ApiSpecification,
  createOpenApiValidatorOptions,
  expectResponse,
  getApplication,
} from '../../src';
import { createFirebaseAuthSecurityHandlers } from '../../src/openapi/firebase-auth';
import { firebaseAuthOpenApiSpec } from '../fixtures/firebase-auth/openapi';

let firebaseAvailable = true;
try {
  await import('@my-f-startup/firebase-auth-express');
} catch {
  firebaseAvailable = false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const describeIf = firebaseAvailable ? describe : describe.skip;

void describeIf('Firebase Auth - Integration Tests', () => {
  const authClient = {
    verifyIdToken: async (token: string) => {
      if (token === 'admin-token') {
        return { uid: 'admin-123', roles: ['admin'] };
      }
      if (token === 'user-token') {
        return { uid: 'user-123', roles: ['user'] };
      }
      throw new Error('Invalid token');
    },
  };

  const given = ApiSpecification.for(
    () => getInMemoryEventStore(),
    () =>
      getApplication({
        apis: [],
        openApiValidator: createOpenApiValidatorOptions(firebaseAuthOpenApiSpec, {
          operationHandlers: path.join(
            __dirname,
            '../fixtures/firebase-auth',
          ),
          validateSecurity: {
            handlers: createFirebaseAuthSecurityHandlers({ authClient }),
          },
        }),
      }),
  );

  void it('Should allow access with valid token', () => {
    return given()
      .when((request) =>
        request.get('/profile').set('Authorization', 'Bearer user-token'),
      )
      .then(expectResponse(200));
  });

  void it('Should reject missing Authorization header', () => {
    return given()
      .when((request) => request.get('/profile'))
      .then(expectResponse(401));
  });

  void it('Should reject invalid token', () => {
    return given()
      .when((request) =>
        request.get('/profile').set('Authorization', 'Bearer invalid-token'),
      )
      .then(expectResponse(401));
  });

  void it('Should enforce admin scope', () => {
    return given()
      .when((request) =>
        request.get('/admin/reports').set('Authorization', 'Bearer user-token'),
      )
      .then(expectResponse(401));
  });

  void it('Should allow admin scope', () => {
    return given()
      .when((request) =>
        request
          .get('/admin/reports')
          .set('Authorization', 'Bearer admin-token'),
      )
      .then(expectResponse(200));
  });
});
