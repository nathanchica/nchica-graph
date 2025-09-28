import type { Resolvers } from '../../generated/graphql.js';
import { type AcTransitBusStopParent } from '../busStop/busStop.resolver.js';

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
