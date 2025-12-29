# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-12-29

### Added

- Optional Pino HTTP logging via the `pinoHttp` application option
- Optional `pino-http` peer dependency

### Documentation

- Documented optional Pino HTTP usage in the README

## [0.2.0] - 2025-12-26

### Added

- Optional Firebase Auth security handlers (`createFirebaseAuthSecurityHandlers`)
- Firebase Auth example and docs updates
- Unit, integration, and e2e tests for Firebase Auth
- Optional `@my-f-startup/firebase-auth-express` peer dependency

### Changed

- OpenAPI document type updated for broader compatibility

## [0.1.0] - 2025-12-12

### Added

- Initial release of emmett-expressjs-with-openapi as standalone package
- Express.js utilities for Emmett applications with OpenAPI 3.x validation
- Integration with express-openapi-validator library
- Operation handlers with automatic route discovery via operationId
- ESM resolver for TypeScript runtime compatibility
- Handler importer for dynamic module loading
- OpenAPI parser for extracting handler information from specs
- Problem details error handling middleware (RFC 7807)
- ETag-based optimistic concurrency control
- HTTP response helpers (send, sendCreated, sendAccepted, sendProblem)
- Testing utilities: ApiSpecification for integration tests
- Testing utilities: ApiE2ESpecification for end-to-end tests
- Comprehensive test coverage:
  - 32 unit tests (etag utils, error mapping)
  - 21 integration tests (routing, validation, handlers, concurrency)
  - 19 e2e tests (complete workflows)
- Examples:
  - `examples/basic` - Manual routes with validation
  - `examples/with-security` - Security handlers showcase
  - `examples/operation-handlers` - Auto-discovered handlers
  - `examples/shopping-cart` - Complete feature example with event sourcing
- Optional WebAPI integration (initializeHandlers option)

### Changed

- Reorganized test structure with flat directory layout
- Moved from nested test folders to descriptive camelCase naming
- Made express-openapi-validator a peer dependency (optional)

### Documentation

- Comprehensive README with quick start guide
- Detailed OpenAPI validation documentation
- Shopping cart example with full documentation
- Test organization and naming conventions

[0.3.0]: https://github.com/emmett-community/emmett-expressjs-with-openapi/releases/tag/0.3.0
[0.2.0]: https://github.com/emmett-community/emmett-expressjs-with-openapi/releases/tag/0.2.0
[0.1.0]: https://github.com/emmett-community/emmett-expressjs-with-openapi/releases/tag/0.1.0
