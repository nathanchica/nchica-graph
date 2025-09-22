import type { YogaInitialContext } from 'graphql-yoga';

import type { Env } from './env.js';
import { env } from './env.js';

export interface GraphQLContext {
    env: Env;
    request: YogaInitialContext['request'];
}

export async function createContext(initialContext: YogaInitialContext): Promise<GraphQLContext> {
    return {
        env,
        request: initialContext.request,
    };
}
