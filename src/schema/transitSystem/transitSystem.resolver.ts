import type { Resolvers } from '../../generated/graphql.js';
import { createBusStopParent, type AcTransitBusStopParent } from '../busStop/busStop.resolver.js';

export type ACTransitSystemParent = {
    __typename: 'ACTransitSystem';
    alias?: string;
    name?: string;
    busStop?: AcTransitBusStopParent | null;
    busStops?: AcTransitBusStopParent[];
};

export function createACTransitSystemParent(data: Partial<ACTransitSystemParent> = {}): ACTransitSystemParent {
    return {
        __typename: 'ACTransitSystem',
        ...data,
    };
}

export const transitSystemResolvers: Resolvers = {
    TransitSystem: {
        __resolveType: (parent) => {
            if (parent.__typename === 'ACTransitSystem' || parent.alias === 'act') {
                return 'ACTransitSystem';
            }
            return null;
        },
    },
    ACTransitSystem: {
        alias: (parent) => parent.alias ?? 'act',
        name: (parent) => parent.name ?? 'AC Transit',
        busStop: async (_parent, args, { loaders }) => {
            // check if bus stop exists
            const busStopProfile = await loaders.busStop.byCode.load(args.busStopCode);
            return busStopProfile ? createBusStopParent({ code: busStopProfile.code }) : null;
        },
        busStops: (parent) => parent.busStops ?? [],
    },
    Query: {
        getTransitSystem: (_parent, args, _context) => {
            if (args.alias === 'act') {
                return createACTransitSystemParent();
            }
            return null;
        },
    },
};
