import { type PositionParent, createPositionParent } from '../schema/root/root.resolver.js';
import type { BusStopProfileRaw } from '../services/actRealtime.schemas.js';

/**
 * Structured bus stop profile data
 */
export type BusStopProfile = {
    id: string; // GTFS stop_id (geoid from API)
    code: string; // 5-digit stop code (stpid from API)
    name: string; // Stop name
    position: PositionParent;
};

export function createBusStopProfile(rawBusStop: BusStopProfileRaw): BusStopProfile {
    if (!rawBusStop.geoid) {
        throw new Error('Cannot create BusStopProfile without geoid');
    }

    if (!rawBusStop.stpid) {
        throw new Error('Cannot create BusStopProfile without stpid');
    }

    return {
        id: rawBusStop.geoid,
        code: rawBusStop.stpid,
        name: rawBusStop.stpnm,
        position: createPositionParent({
            latitude: rawBusStop.lat,
            longitude: rawBusStop.lon,
        }),
    };
}
