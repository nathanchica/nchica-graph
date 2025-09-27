import type { YogaInitialContext } from 'graphql-yoga';

import type { Env } from './env.js';
import { env } from './env.js';
import { createBusStopByCodeLoader, type BusStopByCodeLoader } from './loaders/busStop.js';
import type { ACTRealtimeServiceType } from './services/actRealtime.js';
import type { GTFSRealtimeServiceType } from './services/gtfsRealtime.js';

export type Services = {
    actRealtime: ACTRealtimeServiceType;
    gtfsRealtime: GTFSRealtimeServiceType;
};
export type Loaders = {
    busStop: {
        byCode: BusStopByCodeLoader;
    };
};
export interface GraphQLContext extends YogaInitialContext {
    env: Env;
    services: Services;
    loaders: Loaders;
}

export function createContextFactory(services: Services) {
    return async function createContext(initialContext: YogaInitialContext): Promise<GraphQLContext> {
        const loaders: Loaders = {
            busStop: {
                byCode: createBusStopByCodeLoader(services.actRealtime),
            },
        };

        return {
            ...initialContext,
            env,
            services,
            loaders,
        };
    };
}
