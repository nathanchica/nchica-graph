import { vi } from 'vitest';

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

const normalizeEntities = (message: FeedMessageType): unknown[] => JSON.parse(JSON.stringify(message.entity ?? []));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('GTFS Realtime Service', () => {
    describe('fetch vehicle positions', () => {
        it('fetches and decodes the vehicle positions feed', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const feed = createFeedMessage([createVehicleEntity('51B')]);
            const arrayBufferMock = vi.fn().mockResolvedValue(createFeedArrayBuffer(feed));

            fetchMock.mockResolvedValue({
                ok: true,
                arrayBuffer: arrayBufferMock,
            });

            const service = createGTFSRealtimeService(deps);

            const result = await service.fetchVehiclePositions();

            expect(cacheMock).toHaveBeenCalledWith('bus:all', expect.any(Function), 30);
            expect(fetchMock).toHaveBeenCalledWith({
                url: 'https://gtfs.example.com/vehicles',
                params: { token: 'test-token' },
            });
            expect(arrayBufferMock).toHaveBeenCalledTimes(1);
            expect(normalizeEntities(result as FeedMessageType)).toMatchObject([
                {
                    id: 'vehicle-51B',
                    vehicle: {
                        trip: {
                            routeId: '51B',
                        },
                    },
                },
            ]);
        });

        it('filters vehicle positions when a route ID is provided', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();
            const feed = createFeedMessage([createVehicleEntity('51B'), createVehicleEntity('6')]);

            cacheMock.mockResolvedValue(feed);

            const service = createGTFSRealtimeService(deps);

            const result = (await service.fetchVehiclePositionsForRoute('51B')) as FeedMessageType;

            expect(cacheMock).toHaveBeenCalledWith('bus:all', expect.any(Function), 30);
            expect(fetchMock).not.toHaveBeenCalled();
            const entities = normalizeEntities(result);
            expect(entities).toHaveLength(1);
            expect(entities[0]).toMatchObject({
                id: 'vehicle-51B',
                vehicle: { trip: { routeId: '51B' } },
            });
        });

        it('propagates HTTP errors from the vehicles endpoint', async () => {
            const { deps, fetchMock, cacheMock } = createDependencies();

            fetchMock.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Server Error',
            });
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const service = createGTFSRealtimeService(deps);

            await expect(service.fetchVehiclePositions()).rejects.toThrow('HTTP error! status: 500');

            expect(cacheMock).toHaveBeenCalledWith('bus:all', expect.any(Function), 30);
            expect(errorSpy).toHaveBeenCalledWith(
                'Error fetching GTFS feed from https://gtfs.example.com/vehicles: HTTP error! status: 500'
            );

            errorSpy.mockRestore();
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
