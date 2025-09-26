import type { YogaInitialContext } from 'graphql-yoga';

import type { Env } from './env.js';
import { env } from './env.js';
import type { ACTRealtimeServiceType } from './services/actRealtime.js';
import type { GTFSRealtimeServiceType } from './services/gtfsRealtime.js';

export type Services = {
    actRealtime: ACTRealtimeServiceType;
    gtfsRealtime: GTFSRealtimeServiceType;
};
export interface GraphQLContext extends YogaInitialContext {
    env: Env;
    services: Services;
}

export function createContextFactory(services: Services) {
    return async function createContext(initialContext: YogaInitialContext): Promise<GraphQLContext> {
        return {
            ...initialContext,
            env,
            services,
        };
    };
}
