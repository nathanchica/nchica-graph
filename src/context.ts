import type { YogaInitialContext } from 'graphql-yoga';

import type { Env } from './env.js';
import { env } from './env.js';
import { createBusPositionsByRouteLoader, type BusPositionsByRouteLoader } from './loaders/busPosition.js';
import {
    createBusStopByCodeLoader,
    type BusStopByCodeLoader,
    createBusStopPredictionsLoader,
    type BusStopPredictionsLoader,
} from './loaders/busStop.js';
import type { ACTRealtimeServiceType } from './services/actRealtime.js';
import type { GTFSRealtimeServiceType } from './services/gtfsRealtime.js';

export type Services = {
    actRealtime: ACTRealtimeServiceType;
    gtfsRealtime: GTFSRealtimeServiceType;
};
export type Loaders = {
    busStop: {
        byCode: BusStopByCodeLoader;
        predictions: BusStopPredictionsLoader;
    };
    bus: {
        byRoute: BusPositionsByRouteLoader;
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
                predictions: createBusStopPredictionsLoader(services.actRealtime),
            },
            bus: {
                byRoute: createBusPositionsByRouteLoader(services.actRealtime),
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
