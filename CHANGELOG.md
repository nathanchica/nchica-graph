# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2025-09-27

Added

- Library factory `createGraphQLServer` exposing:
    - `yoga` (GraphQL Yoga request handler)
    - `registerWs(httpServer)` to attach `graphql-ws` subscriptions on the same server and path
- Public entry `src/index.ts` exporting `createGraphQLServer` and `GraphQLContext`.
- README section on Gateway Integration and Environment Variables.

Changed

- Standalone server (`src/server.ts`) now uses `createGraphQLServer` for parity with library usage.
- Environment handling: removed `dotenv` side-effect from `src/env.ts`; standalone server imports `dotenv/config` instead.
- Lint/type safety: replaced empty object generic usage with a precise Yoga return type to satisfy `@typescript-eslint/no-empty-object-type`.

Packaging

- `package.json`:
    - `main`/`types` point to `dist/index.*`.
    - Added `exports` for ESM consumers.
    - Added `files` whitelist (`dist/**`, `README.md`).
    - Added `prepack` script to build on publish.
    - Moved `graphql` to `peerDependencies` and kept it in `devDependencies` for local development.

## [0.1.0] - 2024-09-22

Initial release of GraphQL Yoga server with schema composition, caching utilities, and tests.
