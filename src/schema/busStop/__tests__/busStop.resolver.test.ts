import type { Services } from '../../../context.js';
import { createBusStopProfile } from '../../../formatters/busStop.js';
import type { GetBusStopProfileQuery, BusStopPredictionsSubscription } from '../../../generated/graphql.js';
import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';
import { createMockContext } from '../../../mocks/context.js';
import { createMockEnv } from '../../../mocks/env.js';
import { createMockACTRealtimeService } from '../../../services/__mocks__/actRealtime.js';
import {
    createMockBusStopPredictionRaw,
    createMockBusStopProfileRaw,
} from '../../../services/__mocks__/actRealtimeResponses.js';
import type { ACTRealtimeServiceType } from '../../../services/actRealtime.js';
import { UpstreamHttpError } from '../../../utils/error.js';
import { createBusStopParent } from '../busStop.resolver.js';

describe('createBusStopParent', () => {
    it.each([
        { scenario: 'only code', input: { code: '12345' } },
        { scenario: 'with id', input: { code: '12345', id: 'GTFS_STOP_123' } },
        { scenario: 'with name', input: { code: '12345', name: 'Downtown Stop' } },
        {
            scenario: 'with position',
            input: { code: '12345', position: { __typename: 'Position', latitude: 37.7749, longitude: -122.4194 } },
        },
        {
            scenario: 'with all fields',
            input: {
                code: '54321',
                id: 'GTFS_STOP_987',
                name: 'Uptown',
                position: { __typename: 'Position', latitude: 34.0522, longitude: -118.2437, heading: 90, speed: 30 },
            },
        },
    ])('creates AcTransitBusStopParent $scenario', ({ input }) => {
        const busStop = createBusStopParent(input);
        expect(busStop).toEqual({
            __typename: 'AcTransitBusStop',
            ...input,
            ...(input.position !== undefined && {
                position: {
                    ...input.position,
                    heading: input.position?.heading ?? null,
                    speed: input.position?.speed ?? null,
                },
            }),
        });
    });

    it.each([
        { scenario: 'missing code', input: {} },
        { scenario: 'missing code with id', input: { id: 'GTFS_STOP_123' } },
        { scenario: 'missing code with name', input: { name: 'Some Stop' } },
        {
            scenario: 'missing code with position',
            input: { position: { latitude: 1, longitude: 2 } },
        },
    ])('throws if $scenario', ({ input }) => {
        expect(() => createBusStopParent(input)).toThrow('BusStop code is required to create BusStopParent');
    });
});

describe('busStopResolvers', () => {
    let client: TestGraphQLClient;

    beforeEach(() => {
        client = createTestClient();
    });

    describe('AcTransitBusStop', () => {
        const getBusStopProfileQuery = /* GraphQL */ `
            query GetBusStopProfile($busStopCode: String!) {
                getTransitSystem(alias: "act") {
                    ... on ACTransitSystem {
                        busStop(busStopCode: $busStopCode) {
                            id
                            code
                            name
                            position {
                                latitude
                                longitude
                            }
                        }
                    }
                }
            }
        `;
        const mockBusStopCode = '12345';
        const mockBusStopProfileRaw = createMockBusStopProfileRaw({
            geoid: 'GTFS_STOP_123',
            stpid: mockBusStopCode,
        });

        it('resolves each field', async () => {
            const mockBusStopProfile = createBusStopProfile(mockBusStopProfileRaw);
            const mockFetch = vi.fn().mockResolvedValue({
                [mockBusStopCode]: mockBusStopProfileRaw,
            });
            const mockActRealtimeService = createMockACTRealtimeService({
                fetchBusStopProfiles: mockFetch,
            });
            const mockContext = createMockContext({
                services: {
                    actRealtime: mockActRealtimeService as ACTRealtimeServiceType,
                } as Services,
            });

            const result = await client.request<GetBusStopProfileQuery>(
                getBusStopProfileQuery,
                { busStopCode: mockBusStopCode },
                mockContext
            );

            expect(result.errors).toBeUndefined();
            expect(result.data).toEqual({
                getTransitSystem: {
                    busStop: mockBusStopProfile,
                },
            });
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it.each([
            {
                field: 'id',
                query: /* GraphQL */ `
                    query GetBusStopProfileId($busStopCode: String!) {
                        getTransitSystem(alias: "act") {
                            ... on ACTransitSystem {
                                busStop(busStopCode: $busStopCode) {
                                    id
                                }
                            }
                        }
                    }
                `,
            },
            {
                field: 'name',
                query: /* GraphQL */ `
                    query GetBusStopProfileName($busStopCode: String!) {
                        getTransitSystem(alias: "act") {
                            ... on ACTransitSystem {
                                busStop(busStopCode: $busStopCode) {
                                    name
                                }
                            }
                        }
                    }
                `,
            },
            {
                field: 'latitude',
                query: /* GraphQL */ `
                    query GetBusStopProfileLatitude($busStopCode: String!) {
                        getTransitSystem(alias: "act") {
                            ... on ACTransitSystem {
                                busStop(busStopCode: $busStopCode) {
                                    position {
                                        latitude
                                    }
                                }
                            }
                        }
                    }
                `,
            },
            {
                field: 'longitude',
                query: /* GraphQL */ `
                    query GetBusStopProfileLongitude($busStopCode: String!) {
                        getTransitSystem(alias: "act") {
                            ... on ACTransitSystem {
                                busStop(busStopCode: $busStopCode) {
                                    position {
                                        longitude
                                    }
                                }
                            }
                        }
                    }
                `,
            },
        ])('returns an error when fetching $field fails and nulls busStop', async ({ query }) => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const mockFetch = vi.fn().mockRejectedValue(
                new UpstreamHttpError(`HTTP error! status: 500`, {
                    status: 500,
                    meta: { source: 'ACT_REALTIME', url: 'www.example.com' },
                })
            );
            const mockActRealtimeService = createMockACTRealtimeService({
                fetchBusStopProfiles: mockFetch,
            });
            const mockContext = createMockContext({
                services: {
                    actRealtime: mockActRealtimeService as ACTRealtimeServiceType,
                } as Services,
            });

            const { data, errors } = await client.request(query, { busStopCode: mockBusStopCode }, mockContext);

            expect(data).toEqual({
                getTransitSystem: {
                    busStop: null,
                },
            });

            expect(errors).toBeDefined();
            expect(errors).toHaveLength(1);
            expect(errors).toEqual([
                expect.objectContaining({
                    message: expect.stringContaining('Unexpected error'), // Error will get masked by GQL Yoga
                }),
            ]);
            errorSpy.mockRestore();
        });

        it('handles missing bus stop profile gracefully and nulls busStop', async () => {
            const mockActRealtimeService = createMockACTRealtimeService({
                fetchBusStopProfiles: vi.fn().mockResolvedValue({}),
            });
            const mockContext = createMockContext({
                services: {
                    actRealtime: mockActRealtimeService as ACTRealtimeServiceType,
                } as Services,
            });

            const { data, errors } = await client.request<GetBusStopProfileQuery>(
                getBusStopProfileQuery,
                { busStopCode: mockBusStopCode },
                mockContext
            );

            expect(data).toEqual({
                getTransitSystem: {
                    busStop: null,
                },
            });

            expect(errors).toBeUndefined();
        });
    });

    describe('Subscription.busStopPredictions', () => {
        it('emits multiple events over time (initial + 2 loops)', async () => {
            const query = /* GraphQL */ `
                subscription BusStopPredictionsSubscription(
                    $routeId: String!
                    $stopCode: String!
                    $direction: BusDirection!
                ) {
                    busStopPredictions(routeId: $routeId, stopCode: $stopCode, direction: $direction) {
                        vehicleId
                        tripId
                        arrivalTime
                        minutesAway
                        isOutbound
                    }
                }
            `;

            const routeId = '51B';
            const stopCode = '50373';

            // Tick 1: one outbound, one inbound (inbound should be filtered out for OUTBOUND)
            const tick1 = [
                createMockBusStopPredictionRaw({
                    stpid: stopCode,
                    rtdir: 'Amtrak', // outbound
                    prdtm: '20240701 12:00',
                    prdctdn: '5',
                    vid: 'V-OUT-1',
                    tatripid: 'TRIP-OUT-1',
                }),
                createMockBusStopPredictionRaw({
                    stpid: stopCode,
                    rtdir: 'Rockridge BART', // inbound
                    prdtm: '20240701 12:10',
                    prdctdn: '10',
                    vid: 'V-IN-1',
                    tatripid: 'TRIP-IN-1',
                }),
            ];

            // Tick 2: different outbound prediction
            const tick2 = [
                createMockBusStopPredictionRaw({
                    stpid: stopCode,
                    rtdir: 'Away', // outbound
                    prdtm: '20240701 12:03',
                    prdctdn: '3',
                    vid: 'V-OUT-2',
                    tatripid: 'TRIP-OUT-2',
                }),
            ];

            // Tick 3: two outbound predictions, ensure sorting by arrivalTime asc
            const tick3 = [
                createMockBusStopPredictionRaw({
                    stpid: stopCode,
                    rtdir: 'Amtrak',
                    prdtm: '20240701 12:08',
                    prdctdn: '8',
                    vid: 'V-OUT-4',
                    tatripid: 'TRIP-OUT-4',
                }),
                createMockBusStopPredictionRaw({
                    stpid: stopCode,
                    rtdir: 'Away',
                    prdtm: '20240701 12:06',
                    prdctdn: '6',
                    vid: 'V-OUT-3',
                    tatripid: 'TRIP-OUT-3',
                }),
            ];

            const fetchBusStopPredictions = vi
                .fn()
                .mockResolvedValueOnce({ [stopCode]: tick1 })
                .mockResolvedValueOnce({ [stopCode]: tick2 })
                .mockResolvedValueOnce({ [stopCode]: tick3 });

            const mockActRealtimeService = createMockACTRealtimeService({ fetchBusStopPredictions });
            const env = createMockEnv({ AC_TRANSIT_POLLING_INTERVAL: 1000 });
            const mockContext = {
                services: { actRealtime: mockActRealtimeService as ACTRealtimeServiceType } as Services,
                env,
            };

            vi.useFakeTimers();

            const eventsPromise = client.collectSubscription<BusStopPredictionsSubscription>(
                query,
                { routeId, stopCode, direction: 'OUTBOUND' },
                mockContext,
                { take: 3 }
            );

            await vi.advanceTimersByTimeAsync(env.AC_TRANSIT_POLLING_INTERVAL);
            await vi.advanceTimersByTimeAsync(env.AC_TRANSIT_POLLING_INTERVAL);

            const events = await eventsPromise;

            expect(Array.isArray(events)).toBe(true);
            expect(events).toHaveLength(3);
            events.forEach(({ errors }) => expect(errors).toBeUndefined());

            // Initial payload: only outbound item remains
            expect(events[0].data?.busStopPredictions).toEqual([
                expect.objectContaining({
                    vehicleId: 'V-OUT-1',
                    tripId: 'TRIP-OUT-1',
                    isOutbound: true,
                    minutesAway: 5,
                }),
            ]);

            // Second tick
            expect(events[1].data?.busStopPredictions).toEqual([
                expect.objectContaining({
                    vehicleId: 'V-OUT-2',
                    tripId: 'TRIP-OUT-2',
                    isOutbound: true,
                    minutesAway: 3,
                }),
            ]);

            // Third tick: two results sorted by arrivalTime (12:06, 12:08)
            expect(events[2].data?.busStopPredictions?.map(({ vehicleId }) => vehicleId)).toEqual([
                'V-OUT-3',
                'V-OUT-4',
            ]);

            expect(fetchBusStopPredictions).toHaveBeenCalledTimes(3);
            expect(fetchBusStopPredictions).toHaveBeenNthCalledWith(1, [stopCode], routeId);
            expect(fetchBusStopPredictions).toHaveBeenNthCalledWith(2, [stopCode], routeId);
            expect(fetchBusStopPredictions).toHaveBeenNthCalledWith(3, [stopCode], routeId);

            vi.useRealTimers();
        });

        it('returns GraphQL error when routeId is blank', async () => {
            const query = /* GraphQL */ `
                subscription BusStopPredictions($routeId: String!, $stopCode: String!, $direction: BusDirection!) {
                    busStopPredictions(routeId: $routeId, stopCode: $stopCode, direction: $direction) {
                        vehicleId
                    }
                }
            `;

            const result = await client.request(query, { routeId: ' ', stopCode: '50373', direction: 'OUTBOUND' });
            expect(result.data).toBeUndefined();
            expect(result.errors).toBeDefined();
            const [error] = result.errors as Array<{ message: string; extensions?: Record<string, unknown> }>;
            expect(error.message).toMatch(/routeId argument is required/);
            expect(error.extensions).toMatchObject({ code: 'BAD_REQUEST' });
        });

        it('returns GraphQL error when stopCode is blank', async () => {
            const query = /* GraphQL */ `
                subscription BusStopPredictions($routeId: String!, $stopCode: String!, $direction: BusDirection!) {
                    busStopPredictions(routeId: $routeId, stopCode: $stopCode, direction: $direction) {
                        vehicleId
                    }
                }
            `;

            const result = await client.request(query, { routeId: '51B', stopCode: ' ', direction: 'OUTBOUND' });
            expect(result.data).toBeUndefined();
            expect(result.errors).toBeDefined();
            const [error] = result.errors as Array<{ message: string; extensions?: Record<string, unknown> }>;
            expect(error.message).toMatch(/stopCode argument is required/);
            expect(error.extensions).toMatchObject({ code: 'BAD_REQUEST' });
        });
    });
});
