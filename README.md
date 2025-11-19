# @emmett-community/emmett-expressjs-with-openapi

Express.js utilities for Emmett applications that want OpenAPI 3.x validation without pulling the whole Emmett core. This package wires [`express-openapi-validator`](https://github.com/cdimascio/express-openapi-validator) into the Emmett application builder so you can validate requests, responses, security handlers, file uploads, and formats from a single OpenAPI document.

## Why this package?

- Built as a standalone module extracted from the original `@event-driven-io/emmett` repo so it can evolve independently.
- Keeps the OpenAPI document as the single source of truth across manual routers, validation, and `operationHandlers`.
- Ships with batteries included: problem-details error handling, helpers for tests, and examples for real-world setups.

## Installation

```bash
npm install @emmett-community/emmett-expressjs-with-openapi
npm install express-openapi-validator   # optional peer dependency
```

Other peer requirements (`express`, `@event-driven-io/emmett`, etc.) follow the versions listed in `package.json`.

## Quick start

```typescript
import {
  getApplication,
  createOpenApiValidatorOptions,
} from '@emmett-community/emmett-expressjs-with-openapi';

const app = getApplication({
  apis: [myApi],
  openApiValidator: createOpenApiValidatorOptions('./openapi.yaml', {
    validateRequests: true,
    validateResponses: process.env.NODE_ENV === 'development',
  }),
});
```

Prefer to parse the spec once and share it? Load the `.yml` document manually and reuse it for routing, validation, and automatic `operationHandlers`.

```typescript
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const spec = parse(readFileSync(new URL('./openapi.yml', import.meta.url), 'utf-8'));

const app = getApplication({
  apis: [usersApi],
  openApiValidator: createOpenApiValidatorOptions(spec, {
    operationHandlers: path.join(path.dirname(import.meta.url), './handlers'),
  }),
});
```

## Configuration highlights

`createOpenApiValidatorOptions` forwards every option from `express-openapi-validator`, so you can:

- Enable/disable request or response validation, including per-field tweaks (coercion, unknown query params, removing additional fields, etc.).
- Register custom security handlers with `validateSecurity.handlers`.
- Serve the parsed spec via `serveSpec`, configure file upload limits, ignore health-check routes, or validate the spec itself.
- Reuse `$ref` parsing, custom formats, and file upload middleware exactly as in the upstream validator.

Head to [`docs/openapi-validation.md`](docs/openapi-validation.md) for the full matrix of options, extended explanations, and complete examples. Keeping that document allows us to document advanced scenarios without bloating the README.

## Examples

Working examples live under `examples/`:

- `examples/shopping-cart` – feature-complete Emmett sample (business logic, memory store/publisher, security handlers, OpenAPI file, unit/int/e2e tests, `.http` scripts).
- Legacy quick starts:
  - `examples/basic` – manual routes + validation (minimal scaffolding).
  - `examples/with-security` – standalone security handler demo.
  - `examples/operation-handlers` – barebones `operationHandlers` showcase.

## Tests

Integration and E2E coverage for the OpenAPI module is available in:

- `test/integration/openapi-validation`
- `test/integration/operation-handlers`
- `test/e2e/openapi-validation`
- `test/e2e/operation-handlers`

Run `npm run test` to execute the whole suite.

## Documentation

- **Guide:** [`docs/openapi-validation.md`](docs/openapi-validation.md) – authoritative reference for configuration, advanced usage, and troubleshooting.
- **Emmett docs:** https://event-driven-io.github.io/emmett/

## Contributing

Issues and PRs are welcome! Please open a discussion or ticket if you are unsure about the direction of a change before coding.

## License

MIT
