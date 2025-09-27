import type { ACTRealtimeServiceType } from '../actRealtime.js';
import type { BusStopPredictionRaw, BusStopProfileRaw, BusPositionRaw } from '../actRealtime.schemas.js';

/**
 * Factory to create a typed mock of ACTRealtimeService.
 * Defaults are simple async stubs. Tests can override with vi.fn where needed.
 */
export function createMockACTRealtimeService(overrides?: Partial<ACTRealtimeServiceType>): ACTRealtimeServiceType {
    const defaults = {
        async fetchBusStopProfiles(): Promise<Record<string, BusStopProfileRaw>> {
            return {};
        },
        async fetchBusStopPredictions(): Promise<Record<string, BusStopPredictionRaw[]>> {
            return {};
        },
        async fetchSystemTime(): Promise<Date> {
            return new Date(0);
        },
        async fetchVehiclePositions(): Promise<BusPositionRaw[]> {
            return [];
        },
    };

    return {
        ...defaults,
        ...overrides,
    } as unknown as ACTRealtimeServiceType;
}
