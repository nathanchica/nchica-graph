import DataLoader from 'dataloader';

import { createBusStopProfile, type BusStopProfile } from '../formatters/busStop.js';
import type { ACTRealtimeServiceType } from '../services/actRealtime.js';

export type BusStopByCodeLoader = DataLoader<string, BusStopProfile | null>;

export function createBusStopByCodeLoader(actRealtime: ACTRealtimeServiceType): BusStopByCodeLoader {
    return new DataLoader<string, BusStopProfile | null>(
        async (codes) => {
            const profilesMap = await actRealtime.fetchBusStopProfiles(codes as string[]);

            return codes.map((code) => {
                const raw = profilesMap[code];
                return raw ? createBusStopProfile(raw) : null;
            });
        },
        { cacheKeyFn: (key) => key }
    );
}
