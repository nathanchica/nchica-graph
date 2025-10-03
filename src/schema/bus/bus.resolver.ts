import invariant from 'tiny-invariant';

import type { GraphQLContext } from '../../context.js';
import type { PositionParent } from '../root/root.resolver.js';

export type BusParent = {
    __typename: 'Bus';
    vehicleId: string;
    position?: PositionParent;
};

export function createBusParent(data: Partial<BusParent> = {}): BusParent {
    invariant(data.vehicleId, 'Bus vehicleId is required to create BusParent');
    return {
        __typename: 'Bus',
        vehicleId: data.vehicleId,
        ...data,
    };
}

export const busResolvers = {
    Bus: {
        position: (parent: BusParent, _args: unknown, _ctx: GraphQLContext) => parent.position,
    },
    ACTransitSystem: {
        busesByRoute: () => {
            // TODO: needs service method and loader to fetch all buses of a given route
            throw new Error('Not yet implemented');
        },
    },
};
