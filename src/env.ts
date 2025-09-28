import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({
    quiet: true,
});

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('localhost'),
    PORT: z.coerce.number().int().min(0).max(65535).default(4000),
    ENABLE_CACHE: z.coerce.boolean().default(true),
    REDIS_URL: z.url().optional(),
    CACHE_CLEANUP_THRESHOLD: z.coerce.number().int().min(1).default(100), // number of operations before cleanup

    /**
     * Application-specific environment variables
     */

    /* Where is 51B? Environment Variables */
    WHERE_IS_51B_FRONTEND_URL: z.url().default('http://localhost:5173'),
    WHERE_IS_51B_CACHE_TTL_VEHICLE_POSITIONS: z.coerce.number().min(5).max(300).default(10), // seconds
    WHERE_IS_51B_CACHE_TTL_PREDICTIONS: z.coerce.number().min(5).max(300).default(15), // seconds
    WHERE_IS_51B_CACHE_TTL_SERVICE_ALERTS: z.coerce.number().min(60).max(3600).default(300), // seconds
    WHERE_IS_51B_CACHE_TTL_BUS_STOP_PROFILES: z.coerce.number().min(3600).max(604800).default(86400), // seconds

    /**
     * Service configs and API Keys
     */
    AC_TRANSIT_TOKEN: z.string().min(1),
    AC_TRANSIT_API_BASE_URL: z.url().default('https://api.actransit.org/transit'),
    ACT_REALTIME_API_BASE_URL: z.url().default('https://api.actransit.org/transit/actrealtime'),
    GTFS_REALTIME_API_BASE_URL: z.url().default('https://api.actransit.org/transit/gtfsrt'),
    AC_TRANSIT_POLLING_INTERVAL: z.coerce
        .number()
        .min(5000)
        .max(300000) // Between 5 seconds and 5 minutes
        .default(15000),
    AC_TRANSIT_ALERTS_POLLING_INTERVAL: z.coerce
        .number()
        .min(30000)
        .max(600000) // Between 30 seconds and 10 minutes
        .default(60000), // Default: 60 seconds (4x the regular polling interval)
});

export const env = envSchema.parse(process.env);

export type Env = typeof env;
