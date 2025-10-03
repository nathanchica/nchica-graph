import { createMockEnv } from './env.js';

import type { GraphQLContext } from '../context.js';
import { createBusPositionsByRouteLoader } from '../loaders/busPosition.js';
import { createBusStopByCodeLoader, createBusStopPredictionsLoader } from '../loaders/busStop.js';
import { createACTRealtimeService } from '../services/actRealtime.js';
import { createGTFSRealtimeService } from '../services/gtfsRealtime.js';
import { getCachedOrFetch } from '../utils/cache.js';
import { fetchWithUrlParams } from '../utils/fetch.js';

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

    const mockEnv = createMockEnv();

    const actRealtime = createACTRealtimeService({
        fetchWithUrlParams,
        apiToken: mockEnv.AC_TRANSIT_TOKEN,
        apiBaseUrl: mockEnv.ACT_REALTIME_API_BASE_URL,
        cacheTtl: {
            busStopProfiles: mockEnv.WHERE_IS_51B_CACHE_TTL_BUS_STOP_PROFILES,
            predictions: mockEnv.WHERE_IS_51B_CACHE_TTL_PREDICTIONS,
            vehiclePositions: mockEnv.WHERE_IS_51B_CACHE_TTL_VEHICLE_POSITIONS,
        },
        getCachedOrFetch,
    });

    const gtfsRealtime = createGTFSRealtimeService({
        fetchWithUrlParams,
        apiToken: mockEnv.AC_TRANSIT_TOKEN,
        apiBaseUrl: mockEnv.GTFS_REALTIME_API_BASE_URL,
        cacheTtl: {
            vehiclePositions: mockEnv.WHERE_IS_51B_CACHE_TTL_VEHICLE_POSITIONS,
            tripUpdates: mockEnv.WHERE_IS_51B_CACHE_TTL_PREDICTIONS,
            serviceAlerts: mockEnv.WHERE_IS_51B_CACHE_TTL_SERVICE_ALERTS,
        },
        getCachedOrFetch,
    });

    // Allow tests to override services; build loaders from the final services
    const { services: overrideServices, loaders: overrideLoaders, ...restOverrides } = overrides ?? {};
    const services = {
        actRealtime,
        gtfsRealtime,
        ...overrideServices,
    } as GraphQLContext['services'];

    const defaultLoaders: GraphQLContext['loaders'] = {
        busStop: {
            byCode: createBusStopByCodeLoader(services.actRealtime),
            predictions: createBusStopPredictionsLoader(services.actRealtime),
        },
        bus: {
            byRoute: createBusPositionsByRouteLoader(services.actRealtime),
        },
    };

    const loaders = (overrideLoaders ?? defaultLoaders) as GraphQLContext['loaders'];

    return {
        request: defaultRequest,
        env: mockEnv,
        services,
        loaders,
        ...restOverrides,
    } as GraphQLContext;
};
