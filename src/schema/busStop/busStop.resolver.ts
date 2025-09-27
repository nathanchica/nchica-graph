import { createBusStopProfile, type BusStopProfile } from '../../formatters/busStop.js';
import type { Resolvers } from '../../generated/graphql.js';
import { type ACTRealtimeServiceType } from '../../services/actRealtime.js';

export type AcTransitBusStopParent = {
    __typename: 'AcTransitBusStop';
    id?: string;
    code: string;
    name?: string;
    latitude?: number;
    longitude?: number;
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

async function getBusStopProfile(
    actRealtimeService: ACTRealtimeServiceType,
    busStopCode: string
): Promise<BusStopProfile> {
    const profiles = await actRealtimeService.fetchBusStopProfiles([busStopCode]);
    const rawProfile = profiles[busStopCode];

    if (!rawProfile) {
        throw new Error(`No profile found for stop code ${busStopCode}`);
    }

    return createBusStopProfile(rawProfile);
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
    AcTransitBusStop: {
        id: async (parent, _args, { services }) => {
            // If id is already available, return it
            /* v8 ignore start - No implementation that returns full parent objects */
            if (parent.id) {
                return parent.id;
            }
            /* v8 ignore stop */

            try {
                const { id } = await getBusStopProfile(services.actRealtime, parent.code);
                return id;
            } catch (error) {
                throw new Error(
                    `Failed to fetch stop_id for code ${parent.code}: ${error instanceof Error ? error.message /* v8 ignore next*/ : 'Unknown error'}`
                );
            }
        },

        code: async (parent) => {
            // Code should usually be available already
            if (parent.code) {
                return parent.code;
                /* v8 ignore start - Practically unreachable by query */
            }

            // If we only have id, we'd need reverse lookup (not implemented)
            throw new Error('Cannot resolve BusStop.code without the code field');
            /* v8 ignore stop */
        },

        name: async (parent, _args, { services }) => {
            // If name is already available, return it
            /* v8 ignore start - No implementation that returns full parent objects */
            if (parent.name) {
                return parent.name;
            }
            /* v8 ignore stop */

            try {
                const { name } = await getBusStopProfile(services.actRealtime, parent.code);
                return name;
            } catch (error) {
                throw new Error(
                    `Failed to fetch stop name for code ${parent.code}: ${error instanceof Error ? error.message /* v8 ignore next*/ : 'Unknown error'}`
                );
            }
        },

        latitude: async (parent, _args, { services }) => {
            // If latitude is already available, return it
            /* v8 ignore start - No implementation that returns full parent objects */
            if (parent.latitude) {
                return parent.latitude;
            }
            /* v8 ignore stop */

            try {
                const { latitude } = await getBusStopProfile(services.actRealtime, parent.code);
                return latitude;
            } catch (error) {
                throw new Error(
                    `Failed to fetch latitude for code ${parent.code}: ${error instanceof Error ? error.message /* v8 ignore next*/ : 'Unknown error'}`
                );
            }
        },

        longitude: async (parent, _args, { services }) => {
            // If longitude is already available, return it
            /* v8 ignore start - No implementation that returns full parent objects */
            if (parent.longitude) {
                return parent.longitude;
            }
            /* v8 ignore stop */

            try {
                const { longitude } = await getBusStopProfile(services.actRealtime, parent.code);
                return longitude;
            } catch (error) {
                throw new Error(
                    `Failed to fetch longitude for code ${parent.code}: ${error instanceof Error ? error.message /* v8 ignore next*/ : 'Unknown error'}`
                );
            }
        },
    },
};
