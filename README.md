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

#### Context & services (DI pattern)

- Services are created once at server startup and injected into the GraphQL context via a factory. This avoids per-request instantiation while keeping testability.
- Runtime: `src/server.ts` builds singletons and passes them to the context factory:

    ```ts
    // src/server.ts
    import { createContextFactory, type GraphQLContext } from './context.js';
    import { createACTRealtimeService } from './services/actRealtime.js';
    import { createGTFSRealtimeService } from './services/gtfsRealtime.js';
    import { fetchWithUrlParams } from './utils/fetch.js';
    import { getCachedOrFetch } from './utils/cache.js';

    const services = {
        actRealtime: createACTRealtimeService({
            fetchWithUrlParams,
            apiToken: env.AC_TRANSIT_TOKEN,
            apiBaseUrl: env.ACT_REALTIME_API_BASE_URL,
            cacheTtl: {
                busStopProfiles: env.WHERE_IS_51B_CACHE_TTL_BUS_STOP_PROFILES,
                predictions: env.WHERE_IS_51B_CACHE_TTL_PREDICTIONS,
                vehiclePositions: env.WHERE_IS_51B_CACHE_TTL_VEHICLE_POSITIONS,
            },
            getCachedOrFetch,
        }),
        gtfsRealtime: createGTFSRealtimeService({
            fetchWithUrlParams,
            apiToken: env.AC_TRANSIT_TOKEN,
            apiBaseUrl: env.GTFS_REALTIME_API_BASE_URL,
            cacheTtl: {
                vehiclePositions: env.WHERE_IS_51B_CACHE_TTL_VEHICLE_POSITIONS,
                tripUpdates: env.WHERE_IS_51B_CACHE_TTL_PREDICTIONS,
                serviceAlerts: env.WHERE_IS_51B_CACHE_TTL_SERVICE_ALERTS,
            },
            getCachedOrFetch,
        }),
    };

    const yoga = createYoga<GraphQLContext>({ schema, context: createContextFactory(services) });
    ```

- Context: `src/context.ts` exports a factory that injects `env` and these services into each request’s context:
    ```ts
    // src/context.ts
    export function createContextFactory(services: GraphQLServices) {
        return async (initial) => ({
            ...initial,
            env,
            services,
        });
    }
    ```
- Tests: use `src/mocks/context.ts` (and `src/mocks/client.ts`) to get a fully‑formed `GraphQLContext` with mock `env` and real or mocked services; you can pass overrides per operation as needed.

#### New schema types and resolvers

Use the generator to scaffold and integrate a new GraphQL type.

1. Run the generator

    ```bash
    pnpm generate:type
    ```

    - Enter the Type name in PascalCase (e.g., `NewType`).
    - Enter a short description for the type (used in GraphQL docstrings).

2. What it creates

    For `NewType`, the generator creates:
    - `src/schema/newType/newType.schema.ts` — Schema with type docstring and a placeholder field.
    - `src/schema/newType/newType.resolver.ts` — Parent type scaffold and placeholder resolver.
    - `src/schema/newType/index.ts` — Exports `<name>Defs` and `<name>Resolvers`.

3. Automatic integration

    The generator updates `src/schema/index.ts` to:
    - Add an import: `import { newTypeDefs, newTypeResolvers } from './newType/index.js';`
    - Append `newTypeDefs` to `mergeTypeDefs([...])`.
    - Insert `newTypeResolvers` in the Domain-specific resolvers block before `rootResolvers`.
    - Alphabetize the list of typeDefs (keeping `rootTypeDefs` first) and domain resolvers.

4. Formatting and linting

    After scaffolding, it runs Prettier and ESLint on the new files and `src/schema/index.ts`.

5. Next steps (manual)
    - Replace the placeholder field with real fields and ensure every type/field has a GraphQL docstring.
    - Flesh out the parent type and resolvers; implement any data fetching needed.
    - If the new type should be reachable from `Query`, `Mutation`, or `Subscription`, update the root schema/resolvers accordingly.
    - When the schema is valid, run `pnpm codegen` to refresh generated TypeScript types.

Notes

- If a directory for the chosen type already exists, the generator will exit to avoid overwriting; remove the directory or choose another name.
- The generator doesn’t execute codegen automatically because freshly scaffolded types may not be valid yet.
- ESLint may report `@graphql-eslint/no-unreachable-types` for the new type until it is reachable from
  `Query`, `Mutation`, `Subscription`, or another type. This is expected. Even if ESLint exits with a non‑zero code, it
  still applies autofixes such as import ordering to the changed files.
