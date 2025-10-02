import type { GraphQLContext } from '../../context.js';
import type { Resolvers } from '../../generated/graphql.js';

export type PositionParent = {
    __typename: 'Position';
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
};

export function createPositionParent(busStopData: Partial<PositionParent>): PositionParent {
    /* v8 ignore start - Practically unreachable by query */
    if (busStopData.latitude === undefined || busStopData.longitude === undefined) {
        throw new Error('Position latitude and longitude are required to create PositionParent');
    }
    /* v8 ignore stop */

    return {
        __typename: 'Position',
        latitude: busStopData.latitude,
        longitude: busStopData.longitude,
        heading: busStopData.heading ?? null,
        speed: busStopData.speed ?? null,
    };
}

export const rootResolvers: Resolvers = {
    Query: {
        health: () => 'ok',
        serverVersion: (_parent: unknown, _args: unknown, _ctx: GraphQLContext) => '0.1.0',
    },
    Subscription: {
        heartbeat: {
            subscribe: async function* heartbeatGenerator() {
                while (true) {
                    yield { heartbeat: new Date() };
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            },
        },
    },
};
