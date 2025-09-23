import { GraphQLError } from 'graphql';

import type { Env } from '../../env.js';
import { createMockEnv } from '../../mocks/env.js';

type MockRedisClient = {
    on: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    setex: ReturnType<typeof vi.fn>;
    __eventHandlers: Map<string, (...args: unknown[]) => void>;
};

type MockRedisModule = {
    Redis: ReturnType<typeof vi.fn>;
    default: ReturnType<typeof vi.fn>;
    __instances: MockRedisClient[];
};

vi.mock('ioredis', () => {
    const instances: MockRedisClient[] = [];

    const redisConstructor = vi.fn().mockImplementation(() => {
        const eventHandlers = new Map<string, (...args: unknown[]) => void>();
        const client: MockRedisClient = {
            on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
                eventHandlers.set(event, handler);
                return client;
            }),
            get: vi.fn(),
            setex: vi.fn(),
            __eventHandlers: eventHandlers,
        };

        instances.push(client);
        return client;
    });

    return {
        Redis: redisConstructor,
        default: redisConstructor,
        __instances: instances,
    } satisfies MockRedisModule;
});

async function getRedisMock(): Promise<MockRedisModule> {
    return (await import('ioredis')) as unknown as MockRedisModule;
}

async function loadCacheModule(overrides: Partial<Env> = {}) {
    vi.resetModules();

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
        const redisModule = await getRedisMock();
        redisModule.__instances.length = 0;

        vi.doMock('../../env.js', () => ({
            env: createMockEnv(overrides),
        }));

        return await import('../cache.js');
    } finally {
        logSpy.mockRestore();
        errorSpy.mockRestore();
    }
}

afterEach(() => {
    vi.clearAllMocks();
});

const dataScenarios: Array<{
    name: string;
    createValue: () => unknown;
    assert: (result: unknown, expected: unknown) => void;
    expectedFetcherCalls?: number;
}> = [
    {
        name: 'string',
        createValue: () => 'cached-value',
        assert: (result, expected) => {
            expect(result).toBe(expected);
        },
    },
    {
        name: 'number',
        createValue: () => 42,
        assert: (result, expected) => {
            expect(result).toBe(expected);
        },
    },
    {
        name: 'boolean',
        createValue: () => false,
        assert: (result, expected) => {
            expect(result).toBe(expected);
        },
    },
    {
        name: 'object',
        createValue: () => ({ nested: { value: 'cached' } }),
        assert: (result, expected) => {
            expect(result).toEqual(expected);
        },
    },
    {
        name: 'array',
        createValue: () => [1, 2, 3],
        assert: (result, expected) => {
            expect(result).toEqual(expected);
        },
    },
    {
        name: 'date',
        createValue: () => new Date('2024-01-02T03:04:05.000Z'),
        assert: (result, expected) => {
            expect(result).toBeInstanceOf(Date);
            expect((result as Date).toISOString()).toBe((expected as Date).toISOString());
        },
    },
    {
        name: 'map',
        createValue: () =>
            new Map<string, number>([
                ['a', 1],
                ['b', 2],
            ]),
        assert: (result, expected) => {
            expect(result).toBeInstanceOf(Map);
            expect(Array.from((result as Map<unknown, unknown>).entries())).toEqual(
                Array.from((expected as Map<unknown, unknown>).entries())
            );
        },
    },
    {
        name: 'set',
        createValue: () => new Set([1, 2, 3]),
        assert: (result, expected) => {
            expect(result).toBeInstanceOf(Set);
            expect(Array.from((result as Set<unknown>).values())).toEqual(
                Array.from((expected as Set<unknown>).values())
            );
        },
    },
    {
        name: 'buffer',
        createValue: () => Buffer.from('cached-value'),
        assert: (result, expected) => {
            expect(Buffer.isBuffer(result)).toBe(true);
            expect(Buffer.isBuffer(expected)).toBe(true);
            expect((result as Buffer).equals(expected as Buffer)).toBe(true);
        },
    },
    {
        name: 'undefined',
        createValue: () => undefined,
        assert: (result) => {
            expect(result).toBeUndefined();
        },
    },
    {
        name: 'null',
        createValue: () => null,
        assert: (result) => {
            expect(result).toBeNull();
        },
        expectedFetcherCalls: 2,
    },
];

describe('getCachedOrFetch', () => {
    it.each(dataScenarios)(
        'caches %s values using the hybrid cache',
        async ({ name, createValue, assert, expectedFetcherCalls }) => {
            const { getCachedOrFetch } = await loadCacheModule();
            const value = createValue();
            const fetcher = vi.fn().mockResolvedValue(value);
            const key = `cache-key:${name}`;

            const first = await getCachedOrFetch(key, fetcher, 120);
            assert(first, value);

            const second = await getCachedOrFetch(key, fetcher, 120);
            assert(second, value);

            expect(fetcher).toHaveBeenCalledTimes(expectedFetcherCalls ?? 1);
        }
    );

    it('falls back to the fetcher when caching is disabled', async () => {
        const { getCachedOrFetch, cache } = await loadCacheModule({ ENABLE_CACHE: false });
        const fetcher = vi.fn().mockResolvedValue('fresh-value');
        const setSpy = vi.spyOn(cache, 'set');

        const first = await getCachedOrFetch('no-cache', fetcher);
        expect(first).toBe('fresh-value');

        const second = await getCachedOrFetch('no-cache', fetcher);
        expect(second).toBe('fresh-value');

        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(setSpy).not.toHaveBeenCalled();
    });

    it('uses Redis when a cached value exists', async () => {
        const { getCachedOrFetch } = await loadCacheModule({ REDIS_URL: 'redis://localhost:6379' });
        const redisModule = await getRedisMock();
        const redisInstance = redisModule.__instances.at(-1);

        expect(redisInstance).toBeDefined();

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        redisInstance?.__eventHandlers.get('connect')?.();
        redisInstance?.get.mockResolvedValueOnce(JSON.stringify({ type: 'string', value: 'redis-cached' }));

        const fetcher = vi.fn().mockResolvedValue('fresh-value');
        const result = await getCachedOrFetch('redis-key', fetcher);

        expect(result).toBe('redis-cached');
        expect(fetcher).not.toHaveBeenCalled();
        expect(redisInstance?.get).toHaveBeenCalledWith('redis-key');

        logSpy.mockRestore();
    });

    it('stores fresh values in Redis when cache miss occurs', async () => {
        const { getCachedOrFetch } = await loadCacheModule({ REDIS_URL: 'redis://localhost:6379' });
        const redisModule = await getRedisMock();
        const redisInstance = redisModule.__instances.at(-1);

        expect(redisInstance).toBeDefined();

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        redisInstance?.__eventHandlers.get('connect')?.();
        redisInstance?.get.mockResolvedValueOnce(null);

        const fetcher = vi.fn().mockResolvedValue({ source: 'fetcher' });
        const result = await getCachedOrFetch('redis-miss', fetcher, 180);

        expect(result).toEqual({ source: 'fetcher' });
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(redisInstance?.setex).toHaveBeenCalledTimes(1);
        expect(redisInstance?.setex).toHaveBeenCalledWith('redis-miss', 180, expect.any(String));

        logSpy.mockRestore();
    });

    it('falls back to the fetcher when Redis returns an unsupported payload', async () => {
        const { getCachedOrFetch } = await loadCacheModule({ REDIS_URL: 'redis://localhost:6379' });
        const redisModule = await getRedisMock();
        const redisInstance = redisModule.__instances.at(-1);

        expect(redisInstance).toBeDefined();

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        redisInstance?.__eventHandlers.get('connect')?.();
        redisInstance?.get.mockResolvedValueOnce(JSON.stringify({ type: 'bigint', value: '123' }));

        const fetcher = vi.fn().mockResolvedValue('fresh-from-fetcher');
        const result = await getCachedOrFetch('redis-unsupported', fetcher, 45);

        expect(result).toBe('fresh-from-fetcher');
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(redisInstance?.setex).toHaveBeenCalledWith('redis-unsupported', 45, expect.any(String));
        expect(errorSpy).toHaveBeenCalledWith(
            'Cache deserialization error:',
            expect.stringContaining('Unsupported cache payload type: bigint')
        );

        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    it('falls back to the fetcher when Redis get throws', async () => {
        const { getCachedOrFetch } = await loadCacheModule({ REDIS_URL: 'redis://localhost:6379' });
        const redisModule = await getRedisMock();
        const redisInstance = redisModule.__instances.at(-1);

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        expect(redisInstance).toBeDefined();

        redisInstance?.__eventHandlers.get('connect')?.();
        redisInstance?.get.mockRejectedValueOnce(new Error('redis boom'));

        const fetcher = vi.fn().mockResolvedValue('fallback-value');
        const result = await getCachedOrFetch('redis-error', fetcher, 90);

        expect(result).toBe('fallback-value');
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith('Redis get error:', 'redis boom');
        expect(redisInstance?.setex).toHaveBeenCalledWith('redis-error', 90, expect.any(String));

        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    it('falls back to memory when Redis setex throws', async () => {
        const { getCachedOrFetch } = await loadCacheModule({ REDIS_URL: 'redis://localhost:6379' });
        const redisModule = await getRedisMock();
        const redisInstance = redisModule.__instances.at(-1);

        expect(redisInstance).toBeDefined();

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        redisInstance?.__eventHandlers.get('connect')?.();
        redisInstance?.get.mockResolvedValueOnce(null);
        redisInstance?.setex.mockRejectedValueOnce(new Error('set failure'));

        const fetcher = vi.fn().mockResolvedValue('value-to-cache');
        const result = await getCachedOrFetch('redis-set-failure', fetcher, 30);

        expect(result).toBe('value-to-cache');
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(redisInstance?.setex).toHaveBeenCalledWith('redis-set-failure', 30, expect.any(String));
        expect(errorSpy).toHaveBeenCalledWith('Redis set error:', 'set failure');

        redisInstance?.__eventHandlers.get('error')?.(new Error('redis down'));

        const secondFetch = vi.fn().mockResolvedValue('second-value');
        const secondResult = await getCachedOrFetch('redis-set-failure', secondFetch, 30);

        expect(secondResult).toBe('value-to-cache');
        expect(secondFetch).not.toHaveBeenCalled();
        expect(redisInstance?.get).toHaveBeenCalledTimes(1);

        errorSpy.mockRestore();
        logSpy.mockRestore();
    });

    it('cleans expired memory entries when threshold is reached', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));

        const { getCachedOrFetch, cache } = await loadCacheModule({
            ENABLE_CACHE: true,
            REDIS_URL: undefined,
            CACHE_CLEANUP_THRESHOLD: 2,
        });

        const typedCache = cache as unknown as { cleanupMemoryCache: () => void };
        const cleanupMock = vi.spyOn(typedCache, 'cleanupMemoryCache');
        const fetcher = vi.fn().mockResolvedValue({ value: 'memory-cached' });

        await getCachedOrFetch('memory-key-1', fetcher, 1);
        await getCachedOrFetch('memory-key-2', fetcher, 1);
        await getCachedOrFetch('memory-key-3', fetcher, 1);

        expect(cleanupMock).toHaveBeenCalledTimes(1);
        expect(fetcher).toHaveBeenCalledTimes(3);

        vi.advanceTimersByTime(1500);

        const refreshed = await getCachedOrFetch('memory-key-1', fetcher, 1);
        expect(refreshed).toEqual({ value: 'memory-cached' });
        expect(fetcher).toHaveBeenCalledTimes(4);

        cleanupMock.mockRestore();
        vi.useRealTimers();
    });

    it('defaults cleanup threshold when env omits value', async () => {
        const { cache } = await loadCacheModule({
            ENABLE_CACHE: true,
            REDIS_URL: undefined,
            CACHE_CLEANUP_THRESHOLD: undefined,
        });

        const typedCache = cache as unknown as { cleanupThreshold: number };
        expect(typedCache.cleanupThreshold).toBe(100);
    });

    it('applies retryStrategy with backoff and logs when giving up', async () => {
        await loadCacheModule({ REDIS_URL: 'redis://localhost:6379' });
        const redisModule = await getRedisMock();
        const lastCall = redisModule.Redis.mock.calls.at(-1);

        expect(lastCall).toBeDefined();

        const [, options] = lastCall ?? [];
        expect(options).toBeDefined();

        const retryStrategy = (options as { retryStrategy?: (times: number) => number | null }).retryStrategy;
        expect(retryStrategy).toBeTypeOf('function');

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        expect(retryStrategy?.(1)).toBe(500);
        expect(retryStrategy?.(2)).toBe(1000);
        expect(retryStrategy?.(3)).toBe(1500);
        expect(consoleSpy).not.toHaveBeenCalledWith('⚠️ Redis unavailable, using memory cache');

        expect(retryStrategy?.(4)).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('⚠️ Redis unavailable, using memory cache');

        consoleSpy.mockRestore();
    });

    it.each([
        {
            label: 'generic Error',
            createCase: () => {
                const error = new Error('parse fail');
                return { thrown: error, expected: error.message };
            },
        },
        {
            label: 'GraphQLError',
            createCase: () => {
                const error = new GraphQLError('parse fail');
                return { thrown: error, expected: error.message };
            },
        },
        {
            label: 'string value',
            createCase: () => ({ thrown: 'parse fail string', expected: 'parse fail string' }),
        },
    ])('logs Redis errors and recovers via memory fallback ($label)', async ({ createCase }) => {
        const { getCachedOrFetch } = await loadCacheModule({ REDIS_URL: 'redis://localhost:6379' });
        const redisModule = await getRedisMock();
        const redisInstance = redisModule.__instances.at(-1);

        expect(redisInstance).toBeDefined();

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        redisInstance?.__eventHandlers.get('connect')?.();

        const originalParse = JSON.parse;
        const { thrown: parseError, expected } = createCase();

        const deserializationFetcher = vi.fn().mockResolvedValue('deser-fallback');
        JSON.parse = ((...args: Parameters<typeof JSON.parse>) => {
            void args;
            throw parseError;
        }) as typeof JSON.parse;
        redisInstance?.get.mockResolvedValueOnce('anything');

        let deserResult: unknown;
        try {
            deserResult = await getCachedOrFetch('err-deser', deserializationFetcher, 45);
        } finally {
            JSON.parse = originalParse;
        }
        expect(deserResult).toBe('deser-fallback');
        expect(deserializationFetcher).toHaveBeenCalledTimes(1);

        const getErrorFetcher = vi.fn().mockResolvedValue('get-fallback');
        redisInstance?.get.mockRejectedValueOnce('redis boom');

        const getErrorResult = await getCachedOrFetch('err-get', getErrorFetcher, 45);
        expect(getErrorResult).toBe('get-fallback');
        expect(getErrorFetcher).toHaveBeenCalledTimes(1);

        const setErrorFetcher = vi.fn().mockResolvedValue('set-fallback');
        redisInstance?.get.mockResolvedValueOnce(null);
        redisInstance?.setex.mockRejectedValueOnce('set failure');

        const setErrorResult = await getCachedOrFetch('err-set', setErrorFetcher, 45);
        expect(setErrorResult).toBe('set-fallback');
        expect(setErrorFetcher).toHaveBeenCalledTimes(1);

        expect(errorSpy).toHaveBeenCalledWith('Cache deserialization error:', expected);
        expect(errorSpy).toHaveBeenCalledWith('Redis get error:', 'redis boom');
        expect(errorSpy).toHaveBeenCalledWith('Redis set error:', 'set failure');

        JSON.parse = originalParse;
        errorSpy.mockRestore();
        logSpy.mockRestore();
    });
});
