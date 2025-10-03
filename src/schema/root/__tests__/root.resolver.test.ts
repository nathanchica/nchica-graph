import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';
import { createPositionParent } from '../root.resolver.js';

describe('createPositionParent', () => {
    it.each([
        { latitude: 37.7749, longitude: -122.4194 },
        { latitude: 34.0522, longitude: -118.2437, heading: 180 },
        { latitude: 40.7128, longitude: -74.006, speed: 25 },
        { latitude: 51.5074, longitude: -0.1278, heading: 90, speed: 15 },
    ])(
        'creates PositionParent with latitude $latitude, longitude $longitude, heading $heading, speed $speed',
        (input) => {
            const position = createPositionParent(input);

            expect(position).toEqual({
                __typename: 'Position',
                latitude: input.latitude,
                longitude: input.longitude,
                heading: input.heading ?? null,
                speed: input.speed ?? null,
            });
        }
    );

    it.each([
        { scenario: 'missing longitude', input: { latitude: 37.7749 } },
        { scenario: 'missing latitude', input: { longitude: -122.4194 } },
        { scenario: 'missing both', input: {} },
    ])('throws if $scenario', ({ input }) => {
        expect(() => createPositionParent(input)).toThrow(
            'Position latitude and longitude are required to create PositionParent'
        );
    });
});

describe('rootResolvers', () => {
    let client: TestGraphQLClient;

    beforeEach(() => {
        client = createTestClient();
    });

    it('resolves health checks', async () => {
        const query = `
            query RootInfo {
                health
                serverVersion
            }
        `;
        type ResultType = { health: string; serverVersion: string };

        const result = await client.request<ResultType>(query);

        expect(result.errors).toBeUndefined();
        expect(result.data).toEqual({
            health: 'ok',
            serverVersion: '0.1.0',
        });
    });

    it('emits ISO timestamp strings on heartbeat subscription', async () => {
        const query = `
            subscription Heartbeat {
                heartbeat
            }
        `;
        type ResultType = { heartbeat: string };

        const mockDateISO = '2025-01-01T00:00:00.000Z';
        const mockDate = new Date(mockDateISO);

        const expectedISO2 = '2025-01-01T00:00:01.000Z';

        vi.useFakeTimers();
        vi.setSystemTime(mockDate);

        const subscriptionPromise = client.collectSubscription<ResultType>(query, undefined, undefined, { take: 2 });

        await vi.advanceTimersByTimeAsync(2000);

        const events = await subscriptionPromise;

        expect(Array.isArray(events)).toBe(true);
        expect(events).toHaveLength(2);
        events.forEach(({ errors }) => {
            expect(errors).toBeUndefined();
        });
        expect(events[0].data?.heartbeat).toBe(mockDateISO);
        expect(events[1].data?.heartbeat).toBe(expectedISO2);

        vi.useRealTimers();
    });
});
