import type { Services } from '../../../context.js';
import type { BusesByRouteSubscription } from '../../../generated/graphql.js';
import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';
import { createMockEnv } from '../../../mocks/env.js';
import { createMockACTRealtimeService } from '../../../services/__mocks__/actRealtime.js';
import { createMockBusPositionRaw } from '../../../services/__mocks__/actRealtimeResponses.js';
import type { ACTRealtimeServiceType } from '../../../services/actRealtime.js';
import { createPositionParent } from '../../root/root.resolver.js';
import { createBusParent } from '../bus.resolver.js';

describe('createBusParent', () => {
    it('creates BusParent with required fields only', () => {
        const bus = createBusParent({ vehicleId: 'V-123' });
        expect(bus).toEqual({
            __typename: 'Bus',
            vehicleId: 'V-123',
        });
    });

    it('creates BusParent with position', () => {
        const position = createPositionParent({ latitude: 37.7749, longitude: -122.4194 });
        const bus = createBusParent({ vehicleId: 'V-999', position });
        expect(bus).toEqual({
            __typename: 'Bus',
            vehicleId: 'V-999',
            position,
        });
    });

    it.each([
        { scenario: 'missing vehicleId', input: {} },
        { scenario: 'empty vehicleId', input: { vehicleId: '' } },
        {
            scenario: 'missing vehicleId but has position',
            input: { position: createPositionParent({ latitude: 1, longitude: 2 }) },
        },
    ])('throws if $scenario', ({ input }) => {
        expect(() => createBusParent(input)).toThrowError(/Bus vehicleId is required to create BusParent/);
    });
});

describe('busResolvers', () => {
    let client: TestGraphQLClient;

    beforeEach(() => {
        client = createTestClient();
    });

    describe('Subscription.busesByRoute', () => {
        it('emits multiple events over time (initial + 2 loops)', async () => {
            const query = /* GraphQL */ `
                subscription BusesByRoute($routeId: String!) {
                    busesByRoute(routeId: $routeId) {
                        vehicleId
                        position {
                            latitude
                            longitude
                            heading
                            speed
                        }
                    }
                }
            `;

            const routeId = '6';
            const tick1 = [
                createMockBusPositionRaw({ vid: 'V-100', rt: routeId, lat: '37.1', lon: '-122.1', hdg: '45', spd: 12 }),
                createMockBusPositionRaw({ vid: 'V-200', rt: routeId, lat: '37.2', lon: '-122.2', hdg: '90', spd: 18 }),
            ];
            const tick2 = [
                createMockBusPositionRaw({
                    vid: 'V-100',
                    rt: routeId,
                    lat: '37.15',
                    lon: '-122.15',
                    hdg: '60',
                    spd: 14,
                }),
                createMockBusPositionRaw({
                    vid: 'V-300',
                    rt: routeId,
                    lat: '37.3',
                    lon: '-122.3',
                    hdg: '135',
                    spd: 22,
                }),
            ];
            const tick3 = [
                createMockBusPositionRaw({ vid: 'V-050', rt: routeId, lat: '37.05', lon: '-122.05', hdg: '0', spd: 0 }),
                createMockBusPositionRaw({ vid: 'V-400', rt: routeId, lat: '37.4', lon: '-122.4', hdg: '270', spd: 5 }),
            ];

            const fetchBusPositions = vi
                .fn()
                .mockResolvedValueOnce(tick1)
                .mockResolvedValueOnce(tick2)
                .mockResolvedValueOnce(tick3);

            const mockActRealtimeService = createMockACTRealtimeService({ fetchBusPositions });
            const env = createMockEnv({ AC_TRANSIT_POLLING_INTERVAL: 5000 });
            const mockContext = {
                services: { actRealtime: mockActRealtimeService as ACTRealtimeServiceType } as Services,
                env,
            };

            vi.useFakeTimers();

            const subscriptionPromise = client.collectSubscription<BusesByRouteSubscription>(
                query,
                { routeId },
                mockContext,
                { take: 3 }
            );

            // Advance time to trigger the second and third ticks
            await vi.advanceTimersByTimeAsync(env.AC_TRANSIT_POLLING_INTERVAL);
            await vi.advanceTimersByTimeAsync(env.AC_TRANSIT_POLLING_INTERVAL);

            const events = await subscriptionPromise;

            expect(Array.isArray(events)).toBe(true);
            expect(events).toHaveLength(3);
            events.forEach(({ errors }) => expect(errors).toBeUndefined());

            expect(events[0].data?.busesByRoute).toEqual([
                {
                    vehicleId: 'V-100',
                    position: { latitude: 37.1, longitude: -122.1, heading: 45, speed: 12 },
                },
                {
                    vehicleId: 'V-200',
                    position: { latitude: 37.2, longitude: -122.2, heading: 90, speed: 18 },
                },
            ]);

            expect(events[1].data?.busesByRoute).toEqual([
                {
                    vehicleId: 'V-100',
                    position: { latitude: 37.15, longitude: -122.15, heading: 60, speed: 14 },
                },
                {
                    vehicleId: 'V-300',
                    position: { latitude: 37.3, longitude: -122.3, heading: 135, speed: 22 },
                },
            ]);

            expect(events[2].data?.busesByRoute).toEqual([
                {
                    vehicleId: 'V-050',
                    position: { latitude: 37.05, longitude: -122.05, heading: 0, speed: 0 },
                },
                {
                    vehicleId: 'V-400',
                    position: { latitude: 37.4, longitude: -122.4, heading: 270, speed: 5 },
                },
            ]);

            expect(fetchBusPositions).toHaveBeenCalledTimes(3);
            expect(fetchBusPositions).toHaveBeenNthCalledWith(1, routeId);
            expect(fetchBusPositions).toHaveBeenNthCalledWith(2, routeId);
            expect(fetchBusPositions).toHaveBeenNthCalledWith(3, routeId);

            vi.useRealTimers();
        });
    });
});
