# nchica-graph

Unified GraphQL Yoga server merging multiple internal services into a single schema and Render deployment.

## Stack

- GraphQL Yoga for the server runtime and schema composition
- TypeScript for end-to-end type safety
- Zod for runtime validation of environment configuration and client inputs
- Vitest for unit and integration tests
- Husky + lint-staged running ESLint, Prettier, and TypeScript type checks on staged files

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

- Husky enforces the `pre-commit` hook; lint-staged limits ESLint, Prettier, and type checking to staged files.
- Use Zod schemas to guard any new resolver inputs or configuration before exposing them to the merged graph.
- Goal: consolidate all previous GraphQL service schemas here and deploy only this service to Render.
