import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';

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
