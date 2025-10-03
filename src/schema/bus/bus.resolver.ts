import invariant from 'tiny-invariant';

import type { Resolvers } from '../../generated/graphql.js';
import { type PositionParent, createPositionParent } from '../root/root.resolver.js';

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

export const busResolvers: Resolvers = {
    ACTransitSystem: {
        busesByRoute: async (_parent, args, { loaders }) => {
            const busPositions = await loaders.bus.byRoute.load(args.routeId);
            return busPositions
                .filter((busPosition) => Boolean(busPosition))
                .map((busPosition) =>
                    createBusParent({
                        vehicleId: busPosition.vehicleId,
                        position: createPositionParent(busPosition.position),
                    })
                );
        },
    },
};
