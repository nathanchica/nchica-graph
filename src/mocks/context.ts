import { createMockEnv } from './env.js';

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

    return {
        request: defaultRequest,
        env: createMockEnv(),
        ...overrides,
    };
};
