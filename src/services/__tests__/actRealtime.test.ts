import { vi } from 'vitest';

import {
    createMockBusStopApiResponse,
    createMockBusStopProfileRaw,
    createMockBusStopPredictionsResponse,
    createMockBusStopPredictionRaw,
    createMockBusPositionRaw,
    createMockVehiclePositionsResponse,
} from '../__mocks__/actRealtimeResponses.js';
import { createACTRealtimeService, type ActRealtimeServiceDependencies } from '../actRealtime.js';
import type { BusStopProfileRaw, BusStopPredictionRaw } from '../actRealtime.schemas.js';

const defaultDependencies: ActRealtimeServiceDependencies = {
    fetchWithUrlParams: vi.fn(),
    apiBaseUrl: 'https://api.actransit.org',
    apiToken: 'test-token',
    cacheTtl: {
        busStopProfiles: 86400,
        vehiclePositions: 10,
        predictions: 15,
    },
    getCachedOrFetch: vi.fn().mockImplementation((_key, fetcher, _ttl) => fetcher()),
};

describe('ACT Realtime Service', () => {
    describe('fetch bus stop profiles', () => {
        it.each([
            { description: 'single stop ID', stopIds: ['50373'], expectedFetchCalls: 1 },
            { description: 'multiple stop IDs', stopIds: ['50373', '50374', '50375'], expectedFetchCalls: 1 },
            { description: 'no stop IDs', stopIds: [], expectedFetchCalls: 0 },
        ])('fetches bus stop profiles: $description', async ({ stopIds, expectedFetchCalls }) => {
            const busStopProfiles = stopIds.map((id) => createMockBusStopProfileRaw({ stpid: id }));
            const mockResponse = createMockBusStopApiResponse({
                'bustime-response': {
                    stops: busStopProfiles,
                },
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockResponse),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });
            const expectedResponse = busStopProfiles.reduce(
                (acc, profile) => {
                    acc[profile.stpid] = profile;
                    return acc;
                },
                {} as Record<string, BusStopProfileRaw>
            );

            const response = await service.fetchBusStopProfiles(stopIds);

            expect(mockFetch).toHaveBeenCalledTimes(expectedFetchCalls);
            expect(response).toEqual(expectedResponse);
        });

        it('handles when response is missing stops', async () => {
            const mockResponse = createMockBusStopApiResponse({
                'bustime-response': {
                    stops: [],
                },
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockResponse),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchBusStopProfiles(['50373']);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual({});
        });

        it('returns empty profiles when response shape is missing bustime-response', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({}),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchBusStopProfiles(['50373']);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual({});
        });

        it.each([
            { description: 'missing', payload: { 'bustime-response': {} } },
            { description: 'invalid type', payload: { 'bustime-response': { stops: 'not-an-array' } } },
        ])('returns empty profiles when stops field is $description', async ({ payload }) => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(payload),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchBusStopProfiles(['50373']);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual({});
        });

        it.each([
            { status: 500, statusText: 'Internal Server Error', expectedErrorMessage: 'HTTP error! status: 500' },
            { status: 404, statusText: 'Not Found', expectedErrorMessage: 'HTTP error! status: 404' },
        ])('handles when response is not ok: status $status', async ({ status, statusText, expectedErrorMessage }) => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status,
                statusText,
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });
            await expect(service.fetchBusStopProfiles(['50373'])).rejects.toThrow(expectedErrorMessage);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('fetch bus stop predictions', () => {
        it.each([
            { description: 'single stop ID', stopIds: ['50373'], expectedFetchCalls: 1 },
            { description: 'multiple stop IDs', stopIds: ['50373', '50374', '50375'], expectedFetchCalls: 1 },
            { description: 'no stop IDs', stopIds: [], expectedFetchCalls: 0 },
        ])('fetches bus stop predictions', async ({ stopIds, expectedFetchCalls }) => {
            const mockPredictions = stopIds.map((id) => createMockBusStopPredictionRaw({ stpid: id }));
            const mockResponse = createMockBusStopPredictionsResponse({
                'bustime-response': {
                    prd: mockPredictions,
                },
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockResponse),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });
            const expectedResponse = mockPredictions.reduce(
                (acc, prediction) => {
                    if (!acc[prediction.stpid]) {
                        acc[prediction.stpid] = [];
                    }
                    acc[prediction.stpid].push(prediction);
                    return acc;
                },
                {} as Record<string, Array<BusStopPredictionRaw>>
            );

            const response = await service.fetchBusStopPredictions(stopIds);

            expect(mockFetch).toHaveBeenCalledTimes(expectedFetchCalls);
            expect(response).toEqual(expectedResponse);
        });

        it('handles when response is null', async () => {
            const mockResponse = createMockBusStopPredictionsResponse({
                'bustime-response': {
                    prd: null,
                },
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockResponse),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchBusStopPredictions(['50373']);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual({
                '50373': [],
            });
        });

        it('handles when response is not ok', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });
            await expect(service.fetchBusStopPredictions(['50373'])).rejects.toThrow('HTTP error! status: 500');
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('returns empty predictions map when response shape is missing bustime-response', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({}),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchBusStopPredictions(['50373']);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual({});
        });

        it('returns empty predictions map when prd field is invalid type', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ 'bustime-response': { prd: 'not-an-array' } }),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchBusStopPredictions(['50373']);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual({});
        });
    });

    describe('fetch system time', () => {
        it('fetches system time', async () => {
            const mockDate = new Date('2023-10-10T12:34:00-07:00');
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    'bustime-response': {
                        tm: mockDate.getTime().toString(),
                    },
                }),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchSystemTime();

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual(mockDate);
        });

        it('handles when response is not ok', async () => {
            vi.useFakeTimers();
            const mockDate = new Date('2023-10-10T12:00:00-07:00');
            vi.setSystemTime(mockDate);

            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const response = await service.fetchSystemTime();

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual(mockDate);
            expect(errorSpy).toHaveBeenCalledWith(
                'Error fetching AC Transit system time: HTTP error fetching system time! status: 500'
            );

            errorSpy.mockRestore();
            vi.useRealTimers();
        });

        it.each([
            {
                scenario: 'empty timestamp',
                rawTimestamp: '',
                expectedErrorMessage: 'AC Transit system time response missing timestamp',
            },
            {
                scenario: 'non-numeric timestamp',
                rawTimestamp: 'abc',
                expectedErrorMessage: 'Invalid AC Transit system time value: abc',
            },
            {
                scenario: 'negative timestamp',
                rawTimestamp: '-123456',
                expectedErrorMessage: 'Invalid AC Transit system time value: -123456',
            },
        ])(
            'handles when response has invalid timestamp $scenario and defaults to server local time',
            async ({ rawTimestamp, expectedErrorMessage }) => {
                vi.useFakeTimers();
                const mockDate = new Date('2023-10-10T12:00:00-07:00');
                vi.setSystemTime(mockDate);

                const mockFetch = vi.fn().mockResolvedValue({
                    ok: true,
                    json: vi.fn().mockResolvedValue({
                        'bustime-response': {
                            tm: rawTimestamp,
                        },
                    }),
                });
                const service = createACTRealtimeService({
                    ...defaultDependencies,
                    fetchWithUrlParams: mockFetch,
                });
                const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

                const response = await service.fetchSystemTime();

                expect(mockFetch).toHaveBeenCalledTimes(1);
                expect(response).toEqual(mockDate);
                expect(errorSpy).toHaveBeenCalledWith(`Error fetching AC Transit system time: ${expectedErrorMessage}`);

                errorSpy.mockRestore();
                vi.useRealTimers();
            }
        );

        it('handles invalid response shape (missing bustime-response) and defaults to server local time', async () => {
            vi.useFakeTimers();
            const mockDate = new Date('2023-10-10T12:00:00-07:00');
            vi.setSystemTime(mockDate);

            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({}),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const response = await service.fetchSystemTime();

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual(mockDate);
            expect(errorSpy).toHaveBeenCalledWith(
                'Error fetching AC Transit system time: AC Transit system time response missing timestamp'
            );

            errorSpy.mockRestore();
            vi.useRealTimers();
        });
    });

    describe('fetch bus vehicle positions', () => {
        it.each([
            { routeId: undefined, description: 'all routes' },
            { routeId: '51B', description: 'specific route' },
        ])('fetches bus vehicle positions for $description', async ({ routeId }) => {
            const mockBusPositions = [
                createMockBusPositionRaw({ vid: '1234' }),
                createMockBusPositionRaw({ vid: '5678' }),
            ];
            const mockResponse = createMockVehiclePositionsResponse({
                'bustime-response': {
                    vehicle: mockBusPositions,
                },
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockResponse),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchVehiclePositions(routeId);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual(mockBusPositions);
        });

        it('handles when response is not ok', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });
            await expect(service.fetchVehiclePositions('51B')).rejects.toThrow('HTTP error! status: 500');
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('handles when response is missing vehicles', async () => {
            const mockResponse = createMockVehiclePositionsResponse({
                'bustime-response': {
                    vehicle: [],
                },
            });
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(mockResponse),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchVehiclePositions('51B');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual([]);
        });

        it('returns empty array when response shape is invalid (non-object)', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue(null),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchVehiclePositions('51B');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual([]);
        });

        it('returns empty array when bustime-response is invalid type', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: vi.fn().mockResolvedValue({ 'bustime-response': 'invalid' }),
            });
            const service = createACTRealtimeService({
                ...defaultDependencies,
                fetchWithUrlParams: mockFetch,
            });

            const response = await service.fetchVehiclePositions('51B');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response).toEqual([]);
        });
    });
});
