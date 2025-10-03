import DataLoader from 'dataloader';

import { createBusPositionsFromActRealtime, type BusPosition } from '../formatters/busPosition.js';
import type { ACTRealtimeServiceType } from '../services/actRealtime.js';

export type BusPositionsByRouteLoader = DataLoader<string, Array<BusPosition>>;

export function createBusPositionsByRouteLoader(actRealtime: ACTRealtimeServiceType): BusPositionsByRouteLoader {
    return new DataLoader<string, Array<BusPosition>>(
        async (routeIds) => {
            const results = await Promise.all(
                routeIds.map(async (routeId) => {
                    const raw = await actRealtime.fetchBusPositions(routeId);
                    return createBusPositionsFromActRealtime(raw);
                })
            );
            return results;
        },
        { cacheKeyFn: (key) => key }
    );
}
