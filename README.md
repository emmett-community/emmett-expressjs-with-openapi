# @emmett-community/emmett-expressjs-with-openapi

Express.js utilities for Emmett applications that want OpenAPI 3.x validation without pulling the whole Emmett core. This package wires [`express-openapi-validator`](https://github.com/cdimascio/express-openapi-validator) into the Emmett application builder so you can validate requests, responses, security handlers, file uploads, and formats from a single OpenAPI document.

[![npm version](https://img.shields.io/npm/v/@emmett-community/emmett-expressjs-with-openapi.svg)](https://www.npmjs.com/package/@emmett-community/emmett-expressjs-with-openapi) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Build and test](https://github.com/emmett-community/emmett-expressjs-with-openapi/actions/workflows/build_and_test.yml/badge.svg)](https://github.com/emmett-community/emmett-expressjs-with-openapi/actions/workflows/build_and_test.yml)

## Features

- ✅ **OpenAPI 3.x validation** - Validate requests, responses, security, and file uploads.
- ✅ **Operation handlers** - Auto-wire handlers from `operationId` or `x-eov-operation-handler`.
- ✅ **Problem Details middleware** - RFC 7807 error responses out of the box.
- ✅ **ETag helpers** - Built-in optimistic concurrency utilities.
- ✅ **Testing helpers** - `ApiSpecification` and `ApiE2ESpecification` for tests.
- ✅ **Optional add-ons** - Firebase Auth security handlers and Pino HTTP logging.

## Why this package?

- Built as a standalone module extracted from the original `@event-driven-io/emmett` repo so it can evolve independently.
- Keeps the OpenAPI document as the single source of truth across manual routers, validation, and `operationHandlers`.
- Ships with batteries included: problem-details error handling, helpers for tests, and examples for real-world setups.

## Installation

```bash
npm install @emmett-community/emmett-expressjs-with-openapi
npm install express-openapi-validator            # optional: OpenAPI validation
npm install pino-http                            # optional: HTTP logging
npm install @my-f-startup/firebase-auth-express  # optional: Firebase Auth handlers
```

### Peer Dependencies

Required:
- `@event-driven-io/emmett` ^0.39.1
- `express` ^4.19.2
- `express-async-errors` ^3.1.1
- `http-problem-details` ^0.1.5

TypeScript types:
- `@types/express` ^4.17.21
- `@types/supertest` ^6.0.2 (if using testing helpers)

Optional (feature-gated):
- `express-openapi-validator` ^5.3.7 (OpenAPI validation)
- `pino-http` ^9.0.0 (HTTP logging)
- `@my-f-startup/firebase-auth-express` 0.1.0 (Firebase Auth handlers)
- `supertest` ^7.0.0 (required by testing helpers)

Versions follow what is listed in `package.json`.

## Quick start

```typescript
import {
  getApplication,
  createOpenApiValidatorOptions,
  startAPI,
} from '@emmett-community/emmett-expressjs-with-openapi';

const app = await getApplication({
  apis: [myApi],
  openApiValidator: createOpenApiValidatorOptions('./openapi.yaml', {
    validateRequests: true,
    validateResponses: process.env.NODE_ENV === 'development',
  }),
});

startAPI(app, { port: 3000 });
```

## Configuration

### OpenAPI validation

```typescript
const app = await getApplication({
  apis: [myApi],
  openApiValidator: createOpenApiValidatorOptions('./openapi.yaml', {
    validateRequests: true,
    validateResponses: true,
    operationHandlers: './handlers',
  }),
});
```

Prefer to parse the spec once and share it? Load the `.yml` document manually and reuse it for routing, validation, and automatic `operationHandlers`.

```typescript
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const spec = parse(
  readFileSync(new URL('./openapi.yml', import.meta.url), 'utf-8'),
);

const app = await getApplication({
  apis: [usersApi],
  openApiValidator: createOpenApiValidatorOptions(spec, {
    operationHandlers: path.join(path.dirname(import.meta.url), './handlers'),
  }),
});
```

Highlights:
- Enable/disable request or response validation, including per-field tweaks (coercion, unknown query params, removing additional fields, etc.).
- Register custom security handlers with `validateSecurity.handlers`.
- Serve the parsed spec via `serveSpec`, configure file upload limits, ignore health-check routes, or validate the spec itself.
- Reuse `$ref` parsing, custom formats, and file upload middleware exactly as in the upstream validator.

### Logging (optional)

Install the optional peer to enable HTTP request/response logging:

```bash
npm install pino-http
```

```typescript
const app = await getApplication({
  pinoHttp: true, // defaults
  // or:
  pinoHttp: { autoLogging: false },
});
```

See the full options in the [`pino-http` docs](https://github.com/pinojs/pino-http).

### Firebase Auth (optional)

If you use Firebase Authentication, install the optional peer and plug it into OpenAPI security handlers:

```bash
npm install @my-f-startup/firebase-auth-express
```

```typescript
import admin from 'firebase-admin';
import {
  createFirebaseAuthSecurityHandlers,
  createOpenApiValidatorOptions,
  getApplication,
} from '@emmett-community/emmett-expressjs-with-openapi';

admin.initializeApp();

const app = await getApplication({
  apis: [myApi],
  openApiValidator: createOpenApiValidatorOptions('./openapi.yaml', {
    validateSecurity: {
      handlers: createFirebaseAuthSecurityHandlers(),
    },
  }),
});
```

`@my-f-startup/firebase-auth-express` relies on `firebase-admin`. Make sure the Admin SDK is installed, initialized, and configured for your environment (credentials or emulator).

## API Reference

### Application
- `getApplication(options)` - Creates and configures the Express app.
- `startAPI(app, options)` - Starts the HTTP server.

### OpenAPI
- `createOpenApiValidatorOptions(apiSpec, options)` - Helper to assemble OpenAPI validator config.
- `isOpenApiValidatorAvailable()` - Type guard for optional validator dependency.
- `createFirebaseAuthSecurityHandlers(options)` - Firebase Auth security handlers.
- `registerHandlerModule(handlersPath, module)` - Manual registration for operation handlers.

### HTTP helpers
- `send`, `sendCreated`, `sendAccepted`, `sendProblem` - Standard HTTP responses.

### ETag helpers
- `toWeakETag`, `getETagFromIfMatch`, `getETagFromIfNotMatch`, `getETagValueFromIfMatch`, `setETag`.

### Testing helpers
- `ApiSpecification`, `ApiE2ESpecification`
- `expect`, `expectNewEvents`, `expectResponse`, `expectError`

See [`docs/openapi-validation.md`](docs/openapi-validation.md) for the full matrix of options and extended examples.

## Testing

The package includes comprehensive test coverage:

- **Unit tests** (`test/unit/`) - Utilities for ETag handling, error mapping
- **Integration tests** (`test/integration/`) - Basic routing, OpenAPI validation, operation handlers, optimistic concurrency
- **E2E tests** (`test/e2e/`) - End-to-end workflows for all features

### Running tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:int

# E2E tests
npm run test:e2e

# All tests
npm test
```

## Examples

Working examples live under `examples/`:

- `examples/shopping-cart` – feature-complete Emmett sample (business logic, memory store/publisher, security handlers, OpenAPI file, unit/int/e2e tests, `.http` scripts).
- Legacy quick starts:
  - `examples/basic` – manual routes + validation (minimal scaffolding).
  - `examples/with-security` – standalone security handler demo.
  - `examples/operation-handlers` – barebones `operationHandlers` showcase.
  - `examples/firebase-auth` – Firebase Auth security handlers with operation handlers.

## Documentation

- **Guide:** [`docs/openapi-validation.md`](docs/openapi-validation.md) – authoritative reference for configuration, advanced usage, and troubleshooting.
- **Emmett docs:** <https://event-driven-io.github.io/emmett/>

## Compatibility

- **Node.js**: tested in CI with 24.x
- **Emmett**: ^0.39.1
- **Express**: ^4.19.2

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type-check
npm run build:ts

# Run tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:int

# Run E2E tests
npm run test:e2e
```

## License

MIT

## Related Packages

- [@event-driven-io/emmett](https://github.com/event-driven-io/emmett) - Core Emmett framework
- [@emmett-community/emmett-google-firestore](https://github.com/emmett-community/emmett-google-firestore) - Firestore event store
- [@emmett-community/emmett-google-realtime-db](https://github.com/emmett-community/emmett-google-realtime-db) - Realtime Database inline projections
- [@emmett-community/emmett-google-pubsub](https://github.com/emmett-community/emmett-google-pubsub) - Pub/Sub message bus
- [@event-driven-io/emmett-mongodb](https://github.com/event-driven-io/emmett/tree/main/src/packages/emmett-mongodb) - MongoDB event store

## Support

- [GitHub Issues](https://github.com/emmett-community/emmett-expressjs-with-openapi/issues)
- [Emmett Documentation](https://event-driven-io.github.io/emmett/)

---

Made with ❤️ by the Emmett Community
