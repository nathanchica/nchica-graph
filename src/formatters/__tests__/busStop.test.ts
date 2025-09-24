import { createMockBusStopProfileRaw } from '../../services/__mocks__/actRealtimeResponses.js';
import type { BusStopProfileRaw } from '../../services/actRealtime.js';
import { createBusStopProfile } from '../busStop.js';

describe('createBusStopProfile', () => {
    it('creates a structured BusStopProfile from raw data', () => {
        const raw: BusStopProfileRaw = createMockBusStopProfileRaw({
            geoid: 'GTFS_STOP_123',
            stpid: '50373',
            stpnm: 'Main St & 1st Ave',
            lat: 37.811845,
            lon: -122.267098,
        });

        const profile = createBusStopProfile(raw);

        expect(profile).toEqual({
            id: 'GTFS_STOP_123',
            code: '50373',
            name: 'Main St & 1st Ave',
            latitude: 37.811845,
            longitude: -122.267098,
        });
    });

    it('throws when geoid is missing', () => {
        const raw = createMockBusStopProfileRaw();
        delete (raw as unknown as Record<string, unknown>).geoid;
        const bad = raw as unknown as BusStopProfileRaw;
        expect(() => createBusStopProfile(bad)).toThrowError('Cannot create BusStopProfile without geoid');
    });

    it('throws when stpid is missing', () => {
        const raw = createMockBusStopProfileRaw();
        delete (raw as unknown as Record<string, unknown>).stpid;
        const bad = raw as unknown as BusStopProfileRaw;
        expect(() => createBusStopProfile(bad)).toThrowError('Cannot create BusStopProfile without stpid');
    });
});
