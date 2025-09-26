# nchica-graph

Unified GraphQL Yoga server merging multiple internal services into a single schema and Render deployment.

## Stack

- GraphQL Yoga for the server runtime and schema composition
- TypeScript for end-to-end type safety
- Zod for runtime validation of environment configuration, client inputs, and API responses
- Vitest for unit and integration tests
- Husky + lint-staged running ESLint, Prettier, and TypeScript type checks on staged files
- graphql-codegen for generating TypeScript types based off schema
- ioredis for caching with local in-memory cache support as well
- graphql-ws for websocket server

## Getting Started

1. Install dependencies (commands below use pnpm; swap in npm or yarn if you prefer):

    ```bash
    pnpm install
    ```

2. Configure environment variables:
    - Add a `.env` file (validated with Zod) or set vars in Render.
    - Keep production secrets out of version control.

3. Start developing (scripts will be wired up alongside the server scaffold):
    - `pnpm dev` → launches the Yoga server
    - `pnpm test` → runs Vitest
    - `pnpm lint` → runs ESLint
    - `pnpm format` → runs Prettier
    - `pnpm typecheck` → compiles with `tsc --noEmit`

## Workflow Notes

- Husky enforces the `pre-commit` hook; lint-staged limits ESLint, Prettier, and type checking to staged files. Will also automatically run codegen if schema files are staged.
- Use Zod schemas to guard any new resolver inputs or configuration before exposing them to the merged graph.
- Use Zod schemas to validate any external API responses before using them in resolvers.
- Use dependency injection for services to make testing easier.
- When fetching from external services, use HybridCache (src/utils/cache.ts) for caching the fetched values either in-memory or in a redis server.
- Use mock factories for Yoga client, context, and env vars in src/mocks for tests

#### New schema types and resolvers

- Create new directory under `src/schema`
- Create schema (typeDefs) in `src/schema/new-type-name/new-type-name.schema.ts`
- Create resolvers in `src/schema/new-type-name/new-type-name.resolvers.ts`
- Create index file to export schema and resolvers in `src/schema/new-type-name/index.ts`
- Import new schema and resolvers in `src/schema/index.ts`
- Run codegen `pnpm codegen` to generate types
