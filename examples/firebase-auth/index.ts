/**
 * Example: Firebase Auth + OpenAPI operation handlers
 *
 * Operation handlers are wired from the OpenAPI spec via x-eov-operation-handler.
 */

import {
  createFirebaseAuthSecurityHandlers,
  createOpenApiValidatorOptions,
  getApplication,
  startAPI,
} from '@emmett-community/emmett-expressjs-with-openapi';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Firebase Auth Example',
    version: '1.0.0',
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/profile': {
      get: {
        summary: 'Return the current user profile',
        operationId: 'getProfile',
        'x-eov-operation-handler': 'handlers/profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    uid: { type: 'string' },
                    roles: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/reports': {
      get: {
        summary: 'Admin-only reports',
        operationId: 'getAdminReports',
        'x-eov-operation-handler': 'handlers/adminReports',
        security: [{ bearerAuth: ['admin'] }],
        responses: {
          '200': {
            description: 'Report summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalUsers: { type: 'integer' },
                    totalRevenue: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

type DecodedToken = {
  uid: string;
  roles?: string[];
};

const tokens = new Map<string, DecodedToken>([
  ['token-user', { uid: 'user-123', roles: ['user'] }],
  ['token-admin', { uid: 'admin-456', roles: ['user', 'admin'] }],
]);

const authClient = {
  verifyIdToken: async (token: string): Promise<DecodedToken> => {
    const decoded = tokens.get(token);
    if (!decoded) {
      throw new Error('Invalid token');
    }
    return decoded;
  },
};

const app = await getApplication({
  apis: [],
  openApiValidator: createOpenApiValidatorOptions(openApiSpec, {
    operationHandlers: path.join(__dirname),
    validateSecurity: {
      handlers: createFirebaseAuthSecurityHandlers({
        authClient,
      }),
    },
  }),
});

if (import.meta.url === `file://${process.argv[1]}`) {
  startAPI(app);

  console.log(`
Firebase Auth example running.

Try:

1) Profile (valid token):
   curl http://localhost:3000/profile \\
     -H "Authorization: Bearer token-user"

2) Admin report (admin token):
   curl http://localhost:3000/admin/reports \\
     -H "Authorization: Bearer token-admin"

3) Admin report (non-admin token - should fail):
   curl http://localhost:3000/admin/reports \\
     -H "Authorization: Bearer token-user"
`);
}

export { app };
