export const firebaseAuthOpenApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Firebase Auth Test API',
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
        'x-eov-operation-handler': 'handlers/getProfile',
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
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/admin/reports': {
      get: {
        summary: 'Admin-only reports',
        operationId: 'getAdminReports',
        'x-eov-operation-handler': 'handlers/getAdminReports',
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
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
        },
      },
    },
  },
};
