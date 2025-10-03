import type { Services } from '../../../context.js';
import type { GetTransitSystemQueryQuery } from '../../../generated/graphql.js';
import { createTestClient, type TestGraphQLClient } from '../../../mocks/client.js';
import { createMockEnv } from '../../../mocks/env.js';
import { createMockACTRealtimeService } from '../../../services/__mocks__/actRealtime.js';
import type { ACTRealtimeServiceType } from '../../../services/actRealtime.js';

describe('transitSystemResolvers', () => {
    let client: TestGraphQLClient;

    beforeEach(() => {
        client = createTestClient();
    });

    describe('Query.getTransitSystem', () => {
        const query = /* GraphQL */ `
            query GetTransitSystemQuery($alias: String!) {
                getTransitSystem(alias: $alias) {
                    ... on ACTransitSystem {
                        alias
                        name
                    }
                }
            }
        `;

        it('returns ACTransitSystem for alias "act"', async () => {
            const { data, errors } = await client.request<GetTransitSystemQueryQuery>(query, { alias: 'act' });

            expect(errors).toBeUndefined();
            expect(data).toEqual({
                getTransitSystem: {
                    alias: 'act',
                    name: 'AC Transit',
                },
            });
        });

        it('returns null for unknown alias', async () => {
            const { data, errors } = await client.request(query, { alias: 'invalid' });

            expect(errors).toBeUndefined();
            expect(data).toEqual({
                getTransitSystem: null,
            });
        });
    });

    describe('Subscription.acTransitSystemTime', () => {
        it('emits multiple events over time (initial + 2 loops)', async () => {
            const query = /* GraphQL */ `
                subscription ACTSystemTime {
                    acTransitSystemTime
                }
            `;

            const t1 = new Date('2024-07-01T12:00:00.000Z');
            const t2 = new Date('2024-07-01T12:00:15.000Z');
            const t3 = new Date('2024-07-01T12:00:30.000Z');

            const fetchSystemTime = vi
                .fn()
                .mockResolvedValueOnce(t1)
                .mockResolvedValueOnce(t2)
                .mockResolvedValueOnce(t3);

            const mockActRealtimeService = createMockACTRealtimeService({ fetchSystemTime });
            const env = createMockEnv({ AC_TRANSIT_POLLING_INTERVAL: 5000 });
            const mockContext = {
                services: { actRealtime: mockActRealtimeService as ACTRealtimeServiceType } as Services,
                env,
            };

            vi.useFakeTimers();

            const eventsPromise = client.collectSubscription<{ acTransitSystemTime: string }>(
                query,
                undefined,
                mockContext,
                { take: 3 }
            );

            // Trigger two additional ticks
            await vi.advanceTimersByTimeAsync(env.AC_TRANSIT_POLLING_INTERVAL);
            await vi.advanceTimersByTimeAsync(env.AC_TRANSIT_POLLING_INTERVAL);

            const events = await eventsPromise;

            expect(Array.isArray(events)).toBe(true);
            expect(events).toHaveLength(3);
            events.forEach(({ errors }) => expect(errors).toBeUndefined());

            expect(events[0].data?.acTransitSystemTime).toBe(t1.toISOString());
            expect(events[1].data?.acTransitSystemTime).toBe(t2.toISOString());
            expect(events[2].data?.acTransitSystemTime).toBe(t3.toISOString());

            expect(fetchSystemTime).toHaveBeenCalledTimes(3);
            expect(fetchSystemTime).toHaveBeenNthCalledWith(1);
            expect(fetchSystemTime).toHaveBeenNthCalledWith(2);
            expect(fetchSystemTime).toHaveBeenNthCalledWith(3);

            vi.useRealTimers();
        });
    });
});
