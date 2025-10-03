import { GraphQLError } from 'graphql';
import invariant from 'tiny-invariant';

import type { GraphQLContext } from '../../context.js';
import type { Resolvers } from '../../generated/graphql.js';
import { type PositionParent, createPositionParent } from '../root/root.resolver.js';

export type BusDirection = 'INBOUND' | 'OUTBOUND';

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

export async function getActiveBusesByRoute(routeId: string, context: GraphQLContext): Promise<BusParent[]> {
    const busPositions = await context.loaders.bus.byRoute.clear(routeId).load(routeId);
    return busPositions
        .filter((busPosition) => Boolean(busPosition))
        .map((busPosition) =>
            createBusParent({
                vehicleId: busPosition.vehicleId,
                position: createPositionParent(busPosition.position),
            })
        );
}

export const busResolvers: Resolvers = {
    Subscription: {
        busesByRoute: {
            subscribe: async function* (_parent, args, context) {
                const routeId = args.routeId.trim();
                if (!routeId) {
                    throw new GraphQLError('routeId argument is required', {
                        extensions: { code: 'BAD_REQUEST' },
                    });
                }

                const initialBuses = await getActiveBusesByRoute(routeId, context);
                yield { busesByRoute: initialBuses };

                const intervalMs = context.env.AC_TRANSIT_POLLING_INTERVAL;
                while (true) {
                    const buses = await getActiveBusesByRoute(routeId, context);
                    yield { busesByRoute: buses };
                    await new Promise((resolve) => setTimeout(resolve, intervalMs));
                }
            },
        },
    },
};
