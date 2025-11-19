# Shopping Cart + OpenAPI Example

Event-sourced shopping cart API showcasing how to wire `@event-driven-io/emmett`
with `express-openapi-validator` through this package.

## Highlights

- Business logic/decider copied from the official Emmett samples
- In-memory event store & message bus (`getInMemoryEventStore`, `getInMemoryMessageBus`)
- OpenAPI document on disk (`openapi.yml`) with request/response/security validation
- Operation handlers automatically wired from the OpenAPI spec
- Custom security handler that validates bearer tokens and scopes
- Complete test suite (unit, integration, e2e) plus `.http` manual smoke tests

## Getting Started

```bash
cd examples/shopping-cart
npm install
npm test      # runs unit + integration + e2e tests
npm start     # starts API on http://localhost:3000
```

The `.http` file contains ready-to-run requests (VS Code/REST Client compatible).

## Environment Variables

- `PORT` – overrides default `3000`
- `NODE_ENV=production` – turns off response validation

## Security

The OpenAPI spec requires a bearer token with appropriate scopes. Valid demo tokens:

- `Bearer token-writer` → `cart:write`
- `Bearer token-admin` → `cart:write`, `cart:read`, `admin`

Tests and `.http` examples already set the headers.
