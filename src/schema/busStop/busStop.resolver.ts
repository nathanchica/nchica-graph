import invariant from 'tiny-invariant';

import type { BusStopProfile } from '../../formatters/busStop.js';
import type { Resolvers } from '../../generated/graphql.js';
import { createPositionParent, type PositionParent } from '../root/root.resolver.js';

export type AcTransitBusStopParent = {
    __typename: 'AcTransitBusStop';
    id?: string;
    code: string;
    name?: string;
    position?: PositionParent;
};

export function createBusStopParent(busStopData: Partial<BusStopProfile>): AcTransitBusStopParent {
    invariant(busStopData.code, 'BusStop code is required to create BusStopParent');

    return {
        __typename: 'AcTransitBusStop',
        code: busStopData.code,
        id: busStopData.id,
        name: busStopData.name,
        position: busStopData.position ? createPositionParent(busStopData.position) : undefined,
    };
}

export const busStopResolvers: Resolvers = {
    BusStop: {
        /* v8 ignore start - Practically unreachable by query */
        __resolveType: (parent) => {
            if (parent.__typename === 'AcTransitBusStop') {
                return 'AcTransitBusStop';
            }
            return null;
        },
        /* v8 ignore stop */
    },
    ACTransitSystem: {
        busStop: async (_parent, args, { loaders }) => {
            const busStopProfile = await loaders.busStop.byCode.load(args.busStopCode);
            return busStopProfile ? createBusStopParent(busStopProfile) : null;
        },
        busStops: () => {
            // TODO: needs service method and loader to fetch all stops of a given route
            throw new Error('Not yet implemented');
        },
    },
};
