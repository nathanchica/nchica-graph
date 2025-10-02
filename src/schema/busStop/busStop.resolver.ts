import type { Resolvers } from '../../generated/graphql.js';
import type { PositionParent } from '../root/root.resolver.js';

export type AcTransitBusStopParent = {
    __typename: 'AcTransitBusStop';
    id?: string;
    code: string;
    name?: string;
    position?: PositionParent;
};

export function createBusStopParent(busStopData: Partial<AcTransitBusStopParent>): AcTransitBusStopParent {
    /* v8 ignore start - Practically unreachable by query */
    if (!busStopData.code) {
        throw new Error('BusStop code is required to create BusStopParent');
    }
    /* v8 ignore stop */
    return {
        __typename: 'AcTransitBusStop',
        code: busStopData.code,
        ...busStopData,
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
            // check if bus stop exists
            const busStopProfile = await loaders.busStop.byCode.load(args.busStopCode);
            return busStopProfile ? createBusStopParent(busStopProfile) : null;
        },
        busStops: () => {
            // TODO: needs service method and loader to fetch all stops of a given route
            throw new Error('Not yet implemented');
        },
    },
};
