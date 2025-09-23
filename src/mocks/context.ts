import type { GraphQLContext } from '../context.js';

export const createMockContext = (overrides?: Partial<GraphQLContext>): GraphQLContext => {
    // Create default mock request if not provided
    const defaultRequest = new Request('http://localhost:4000/graphql', {
        method: 'POST',
        headers: new Headers({
            'Content-Type': 'application/json',
            'x-forwarded-for': '127.0.0.1',
            'user-agent': 'mock-user-agent',
        }),
    });

    const mockEnv = {
        NODE_ENV: 'test' as const,
        HOST: 'localhost',
        PORT: 4000,
        ENABLE_CACHE: true,
        REDIS_URL: undefined,
        CACHE_CLEANUP_THRESHOLD: 100,
    };

    return {
        request: defaultRequest,
        env: mockEnv,
        ...overrides,
    };
};
