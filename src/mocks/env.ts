import { type Env } from '../env.js';

export const createMockEnv = (overrides?: Partial<Env>): Env => ({
    NODE_ENV: 'test',
    HOST: 'localhost',
    PORT: 4000,
    ENABLE_CACHE: true,
    REDIS_URL: undefined,
    CACHE_CLEANUP_THRESHOLD: 100,
    /* Where is 51B? Environment Variables */
    WHERE_IS_51B_FRONTEND_URL: 'http://localhost:5173',
    WHERE_IS_51B_CACHE_TTL_VEHICLE_POSITIONS: 10,
    WHERE_IS_51B_CACHE_TTL_PREDICTIONS: 15,
    WHERE_IS_51B_CACHE_TTL_SERVICE_ALERTS: 300,
    WHERE_IS_51B_CACHE_TTL_BUS_STOP_PROFILES: 86400,
    /* Service configs and API Keys */
    AC_TRANSIT_TOKEN: 'test-token',
    AC_TRANSIT_API_BASE_URL: 'https://api.actransit.org/transit',
    ACT_REALTIME_API_BASE_URL: 'https://api.actransit.org/transit/actrealtime',
    GTFS_REALTIME_API_BASE_URL: 'https://api.actransit.org/transit/gtfsrt',
    AC_TRANSIT_POLLING_INTERVAL: 15000,
    AC_TRANSIT_ALERTS_POLLING_INTERVAL: 60000,

    ...overrides,
});
