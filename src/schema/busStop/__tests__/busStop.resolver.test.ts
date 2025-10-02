import type { Services } from '../../../context.js';
import { createBusStopProfile } from '../../../formatters/busStop.js';
import type { GetBusStopProfileQuery } from '../../../generated/graphql.js';
import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';
import { createMockContext } from '../../../mocks/context.js';
import { createMockACTRealtimeService } from '../../../services/__mocks__/actRealtime.js';
import { createMockBusStopProfileRaw } from '../../../services/__mocks__/actRealtimeResponses.js';
import type { ACTRealtimeServiceType } from '../../../services/actRealtime.js';
import { UpstreamHttpError } from '../../../utils/error.js';

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
});
