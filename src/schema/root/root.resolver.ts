import invariant from 'tiny-invariant';

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
    const { latitude, longitude } = busStopData;

    invariant(
        latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null,
        'Position latitude and longitude are required to create PositionParent'
    );

    return {
        __typename: 'Position',
        latitude,
        longitude,
        heading: busStopData.heading ?? undefined,
        speed: busStopData.speed ?? undefined,
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
