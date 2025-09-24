import { vi } from 'vitest';

import { UpstreamParseError } from '../../utils/error.js';
import {
    createAlertEntity,
    createFeedArrayBuffer,
    createFeedMessage,
    createTripUpdateEntity,
    createVehicleEntity,
    type FeedMessageType,
} from '../__mocks__/gtfsRealtimeResponses.js';
import { createGTFSRealtimeService, type GTFSRealtimeServiceDependencies } from '../gtfsRealtime.js';

type MockedDependencies = {
    deps: GTFSRealtimeServiceDependencies;
    fetchMock: ReturnType<typeof vi.fn>;
    cacheMock: ReturnType<typeof vi.fn>;
};

const createDependencies = (): MockedDependencies => {
    const fetchMock = vi.fn();
    const cacheMock = vi.fn().mockImplementation(async (_key, fetcher) => fetcher());

    const deps: GTFSRealtimeServiceDependencies = {
        fetchWithUrlParams: fetchMock,
        apiBaseUrl: 'https://gtfs.example.com',
        apiToken: 'test-token',
        cacheTtl: {
            vehiclePositions: 30,
            tripUpdates: 45,
            serviceAlerts: 60,
        },
        getCachedOrFetch: cacheMock,
    };

    return { deps, fetchMock, cacheMock };
};

const defaultDependencies = {
    fetchWithUrlParams: vi.fn(),
    apiBaseUrl: 'https://api.actransit.org',
    apiToken: 'test-token',
    cacheTtl: {
        vehiclePositions: 30,
        tripUpdates: 45,
        serviceAlerts: 60,
    },
    getCachedOrFetch: vi.fn().mockImplementation((_key, fetcher, _ttl) => fetcher()),
};

const normalizeEntities = (message: FeedMessageType): unknown[] => JSON.parse(JSON.stringify(message.entity ?? []));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('GTFS Realtime Service', () => {
    describe('fetch vehicle positions', () => {
        it('fetches and decodes the vehicle positions feed', async () => {
            const mockVehicleEntity = createVehicleEntity('51B');
            const mockEntities = [mockVehicleEntity];
            const mockFeed = createFeedMessage(mockEntities);
            const mockResponse = createFeedArrayBuffer(mockFeed);
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: vi.fn().mockResolvedValue(mockResponse),
            });

            const service = createGTFSRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const result = await service.fetchVehiclePositions();
            const normalizedResult = normalizeEntities(result);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(normalizedResult).toEqual(mockEntities);
        });

        it('fetches vehicle positions for a given route', async () => {
            const vehicleInRoute = createVehicleEntity('51B');
            const vehicleNotInRoute = createVehicleEntity('6');
            const mockEntities = [vehicleInRoute, vehicleNotInRoute];
            const mockFeed = createFeedMessage(mockEntities);
            const mockResponse = createFeedArrayBuffer(mockFeed);
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: vi.fn().mockResolvedValue(mockResponse),
            });

            const service = createGTFSRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const result = await service.fetchVehiclePositionsForRoute('51B');
            const normalizedResult = normalizeEntities(result);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(normalizedResult).toEqual([vehicleInRoute]);
        });

        it('propagates HTTP errors from the vehicles endpoint', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();

            fetchMock.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
            });

            const service = createGTFSRealtimeService(deps);

            await expect(service.fetchVehiclePositions()).rejects.toThrow('HTTP error! status: 500');

            expect(cacheMock).toHaveBeenCalledWith('bus:all', expect.any(Function), 30);
        });

        it('throws UpstreamParseError when protobuf decoding fails', async () => {
            const { deps, fetchMock } = createDependencies();
            const invalidBuffer = new Uint8Array([0xff]).buffer; // invalid varint to trigger decode failure

            fetchMock.mockResolvedValue({
                ok: true,
                arrayBuffer: vi.fn().mockResolvedValue(invalidBuffer),
            });

            const service = createGTFSRealtimeService(deps);

            let thrown: unknown;
            try {
                await service.fetchVehiclePositions();
            } catch (e) {
                thrown = e;
            }

            expect(thrown).toBeInstanceOf(UpstreamParseError);
            expect((thrown as Error).message).toBe('Failed to parse GTFS feed');
        });
    });

    describe('fetch trip updates', () => {
        it('fetches and decodes the trip updates feed', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const feed = createFeedMessage([createTripUpdateEntity('51B')]);
            const arrayBufferMock = vi.fn().mockResolvedValue(createFeedArrayBuffer(feed));

            fetchMock.mockResolvedValue({
                ok: true,
                arrayBuffer: arrayBufferMock,
            });

            const service = createGTFSRealtimeService(deps);

            const result = await service.fetchTripUpdates();

            expect(cacheMock).toHaveBeenCalledWith('trips:all', expect.any(Function), 45);
            expect(fetchMock).toHaveBeenCalledWith({
                url: 'https://gtfs.example.com/tripupdates',
                params: { token: 'test-token' },
            });
            expect(arrayBufferMock).toHaveBeenCalledTimes(1);
            expect(normalizeEntities(result as FeedMessageType)).toMatchObject([
                {
                    id: 'trip-51B',
                    tripUpdate: {
                        trip: { routeId: '51B' },
                    },
                },
            ]);
        });

        it('filters trip updates by route', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const feed = createFeedMessage([createTripUpdateEntity('51B'), createTripUpdateEntity('6')]);

            cacheMock.mockResolvedValue(feed);

            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchTripUpdatesForRoute('51B')) as FeedMessageType;

            expect(cacheMock).toHaveBeenCalledWith('trips:all', expect.any(Function), 45);
            expect(fetchMock).not.toHaveBeenCalled();
            const entities = normalizeEntities(result);
            expect(entities).toHaveLength(1);
            expect(entities[0]).toMatchObject({
                id: 'trip-51B',
                tripUpdate: { trip: { routeId: '51B' } },
            });
        });

        it('filters trip updates by route and stop ID', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const feed = createFeedMessage([
                createTripUpdateEntity('51B', ['target-stop', 'other-stop']),
                createTripUpdateEntity('51B', ['other-stop']),
                createTripUpdateEntity('6', ['target-stop']),
            ]);

            cacheMock.mockResolvedValue(feed);

            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchTripUpdatesForRoute('51B', 'target-stop')) as FeedMessageType;

            expect(cacheMock).toHaveBeenCalledWith('trips:all', expect.any(Function), 45);
            expect(fetchMock).not.toHaveBeenCalled();
            expect(normalizeEntities(result)).toEqual([
                {
                    id: 'trip-51B',
                    tripUpdate: {
                        trip: { routeId: '51B' },
                        stopTimeUpdate: [{ stopId: 'target-stop' }],
                    },
                },
            ]);
        });

        it('omits entities without tripUpdate when filtering by stop ID', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const feed = createFeedMessage([createVehicleEntity('51B')]);

            cacheMock.mockResolvedValue(feed);

            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchTripUpdatesForRoute('51B', 'target-stop')) as FeedMessageType;

            expect(cacheMock).toHaveBeenCalledWith('trips:all', expect.any(Function), 45);
            expect(fetchMock).not.toHaveBeenCalled();
            expect(normalizeEntities(result)).toEqual([]);
        });

        it('handles undefined routeFiltered.entity when filtering by stop ID', async () => {
            const { deps, cacheMock } = createDependencies();
            const feed = createFeedMessage([createTripUpdateEntity('51B', ['target-stop'])]);

            cacheMock.mockResolvedValue(feed);

            const service = createGTFSRealtimeService(deps);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.spyOn(service as any, 'filterByRoute').mockReturnValue({
                header: feed.header,
                // entity intentionally undefined
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const result = (await service.fetchTripUpdatesForRoute('51B', 'target-stop')) as FeedMessageType;
            expect(normalizeEntities(result)).toEqual([]);
        });

        it('handles null routeFiltered.entity when filtering by stop ID', async () => {
            const { deps, cacheMock } = createDependencies();
            const feed = createFeedMessage([createTripUpdateEntity('51B', ['target-stop'])]);

            cacheMock.mockResolvedValue(feed);

            const service = createGTFSRealtimeService(deps);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.spyOn(service as any, 'filterByRoute').mockReturnValue({
                header: feed.header,
                entity: null,
            });

            const result = (await service.fetchTripUpdatesForRoute('51B', 'target-stop')) as FeedMessageType;
            expect(normalizeEntities(result)).toEqual([]);
        });

        it('handles undefined stopTimeUpdate when filtering by stop ID', async () => {
            const { deps, cacheMock } = createDependencies();
            const entity = createTripUpdateEntity('51B');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (entity.tripUpdate as any).stopTimeUpdate;
            const feed = createFeedMessage([entity]);

            cacheMock.mockResolvedValue(feed);
            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchTripUpdatesForRoute('51B', 'target-stop')) as FeedMessageType;
            expect(normalizeEntities(result)).toEqual([]);
        });

        it('handles null stopTimeUpdate when filtering by stop ID', async () => {
            const { deps, cacheMock } = createDependencies();
            const entity = createTripUpdateEntity('51B');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (entity.tripUpdate as any).stopTimeUpdate = null;
            const feed = createFeedMessage([entity]);

            cacheMock.mockResolvedValue(feed);
            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchTripUpdatesForRoute('51B', 'target-stop')) as FeedMessageType;
            expect(normalizeEntities(result)).toEqual([]);
        });

        it('handles undefined feed.entity when filtering by route', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const base = createFeedMessage();
            const feed = { header: base.header };

            cacheMock.mockResolvedValue(feed);
            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchTripUpdatesForRoute('51B')) as FeedMessageType;
            expect(cacheMock).toHaveBeenCalledWith('trips:all', expect.any(Function), 45);
            expect(fetchMock).not.toHaveBeenCalled();
            expect(normalizeEntities(result)).toEqual([]);
        });

        it('handles null feed.entity when filtering by route', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const base = createFeedMessage();
            const feed = { header: base.header, entity: null };

            cacheMock.mockResolvedValue(feed);
            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchTripUpdatesForRoute('51B')) as FeedMessageType;
            expect(cacheMock).toHaveBeenCalledWith('trips:all', expect.any(Function), 45);
            expect(fetchMock).not.toHaveBeenCalled();
            expect(normalizeEntities(result)).toEqual([]);
        });
    });

    describe('fetch service alerts', () => {
        it('fetches and decodes the service alerts feed', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const feed = createFeedMessage([createAlertEntity('51B')]);
            const arrayBufferMock = vi.fn().mockResolvedValue(createFeedArrayBuffer(feed));

            fetchMock.mockResolvedValue({
                ok: true,
                arrayBuffer: arrayBufferMock,
            });

            const service = createGTFSRealtimeService(deps);

            const result = await service.fetchServiceAlerts();

            expect(cacheMock).toHaveBeenCalledWith('alerts:all', expect.any(Function), 60);
            expect(fetchMock).toHaveBeenCalledWith({
                url: 'https://gtfs.example.com/alerts',
                params: { token: 'test-token' },
            });
            expect(arrayBufferMock).toHaveBeenCalledTimes(1);
            expect(normalizeEntities(result as FeedMessageType)).toMatchObject([
                {
                    id: 'alert-51B',
                    alert: {
                        informedEntity: [{ routeId: '51B' }],
                    },
                },
            ]);
        });

        it('filters service alerts by route', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const feed = createFeedMessage([createAlertEntity('51B'), createAlertEntity('6')]);

            cacheMock.mockResolvedValue(feed);

            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchServiceAlertsForRoute('51B')) as FeedMessageType;

            expect(cacheMock).toHaveBeenCalledWith('alerts:all', expect.any(Function), 60);
            expect(fetchMock).not.toHaveBeenCalled();
            const entities = normalizeEntities(result);
            expect(entities).toHaveLength(1);
            expect(entities[0]).toMatchObject({
                id: 'alert-51B',
                alert: {
                    informedEntity: [{ routeId: '51B' }],
                },
            });
        });
    });
});
