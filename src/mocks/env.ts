import { type Env } from '../env.js';

export const createMockEnv = (overrides?: Partial<Env>): Env => ({
    NODE_ENV: 'test',
    HOST: 'localhost',
    PORT: 4000,
    ENABLE_CACHE: true,
    REDIS_URL: undefined,
    CACHE_CLEANUP_THRESHOLD: 100,
    ...overrides,
});
