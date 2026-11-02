# Roadmap

Work planned for this library. All changes must be backward compatible.

Legend: Done, Partial, Open, Not verified.

| Item | Status | Evidence and note |
|---|---|---|
| Map concurrency errors to 409 or 412 | Done (0.9.0) | The default error mapping reads `status`, `statusCode` and `errorCode`. An `ExpectedVersionConflictError` (matched by name, 412) answers Problem Details with `code` `VERSION_CONFLICT` and a detail that does not name the stream or versions (`test/unit/problemDetailsMiddleware.unit.spec.ts`). An ETag mismatch answers 412 (`test/e2e/optimisticConcurrency.e2e.spec.ts`) |
| Correct the conditional request header handling | Done (0.9.0) | `getETagFromIfNoneMatch` reads `if-none-match` and still accepts the old `if-not-match`. `getETagFromIfNotMatch` is a deprecated alias and now throws `MISSING_IF_NOT_MATCH_HEADER` when the header is missing, instead of `MISSING_IF_MATCH_HEADER` |
| Move `supertest` out of runtime dependencies | Open | The testing helpers (`ApiSpecification`, `ApiE2ESpecification`) import `supertest`, and the main entry re-exports them, so a library consumer that does not install it would fail on import. Needs a separate `/testing` entry for the helpers first, then `supertest` can become an optional peer dependency |
| Cache the authentication middleware | Not verified | |
| Support extra security schemes for webhooks | Not verified | |
