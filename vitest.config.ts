import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/__tests__/**/*.ts'],
        clearMocks: true,
        globals: true,
        coverage: {
            provider: 'v8',
            exclude: [
                ...coverageConfigDefaults.exclude,
                'src/mocks/**',
                'src/**/index.ts',
                'src/generated/**',
                'src/env.ts',
                'src/context.ts',
                'src/server.ts',
                'codegen.ts',
                'graphql.config.js',
            ],
        },
        setupFiles: ['./src/testSetup.ts'],
    },
});
