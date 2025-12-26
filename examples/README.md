# Emmett Express.js Examples

This directory now centres on a full-featured shopping cart that mirrors the
official Emmett samples while staying completely in-memory.

## Shopping Cart + OpenAPI

**Location:** [shopping-cart/](./shopping-cart/)

Showcases:

- Domain/business logic (decider + commands/events)
- In-memory event store & message bus
- OpenAPI file on disk + validator + operation handlers
- Custom bearer-token security handler
- Unit, integration, and end-to-end tests
- `.http` file for quick manual smoke testing

**Run:**

```bash
cd examples/shopping-cart
npm install
npm test    # unit + integration + e2e
npm start   # launches http://localhost:3000
```

## Legacy quick references

Still useful for small focused demos:

- [basic/](./basic/) – bare minimum wiring for validation.
- [firebase-auth/](./firebase-auth/) – Firebase Auth + operation handlers + guards.
- [with-security/](./with-security/) – standalone security handler example.
- [operation-handlers/](./operation-handlers/) – automatic routing showcase.

## Learn More

- 📚 [OpenAPI Validation Guide](../docs/openapi-validation.md)
- 📖 [Full Documentation](https://event-driven-io.github.io/emmett/)
- 💬 [GitHub Discussions](https://github.com/event-driven-io/emmett/discussions)
