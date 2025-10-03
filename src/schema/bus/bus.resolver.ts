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
    Subscription: {
        busesByRoute: {
            subscribe: async function* (_parent, args, ctx) {
                const routeId = args.routeId.trim();

                const initialBusPositions = await ctx.loaders.bus.byRoute.clear(routeId).load(routeId);
                const initialBuses = initialBusPositions
                    .filter((busPosition) => Boolean(busPosition))
                    .map((busPosition) =>
                        createBusParent({
                            vehicleId: busPosition.vehicleId,
                            position: createPositionParent(busPosition.position),
                        })
                    );
                yield { busesByRoute: initialBuses };

                const intervalMs = ctx.env.AC_TRANSIT_POLLING_INTERVAL;
                while (true) {
                    const busPositions = await ctx.loaders.bus.byRoute.clear(routeId).load(routeId);
                    const buses = busPositions
                        .filter((busPosition) => Boolean(busPosition))
                        .map((busPosition) =>
                            createBusParent({
                                vehicleId: busPosition.vehicleId,
                                position: createPositionParent(busPosition.position),
                            })
                        );
                    yield { busesByRoute: buses };
                    await new Promise((resolve) => setTimeout(resolve, intervalMs));
                }
            },
        },
    },
};
