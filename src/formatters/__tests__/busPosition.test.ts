import { createMockBusPositionRaw } from '../../services/__mocks__/actRealtimeResponses.js';
import type { BusPositionRaw } from '../../services/actRealtime.schemas.js';
import { createBusPositionsFromActRealtime } from '../busPosition.js';

describe('createBusPositionsFromActRealtime', () => {
    it('returns empty array when no positions', () => {
        expect(createBusPositionsFromActRealtime([])).toEqual([]);
        expect(createBusPositionsFromActRealtime(undefined as unknown as BusPositionRaw[])).toEqual([]);
    });

    it('parses valid entries, filters invalid, trims values, and sorts by vehicleId', () => {
        const invalid = createMockBusPositionRaw({
            vid: 'BAD',
            lat: '', // empty -> filtered
            lon: '-122.2',
            hdg: '180',
            spd: '25',
        });
        const valid2 = createMockBusPositionRaw({
            vid: 'V-001',
            rt: '51A',
            lat: '37.2',
            lon: '-122.3',
            hdg: 90,
            spd: ' 35 ',
            tatripid: '   ', // fallback to tripid
            tripid: 789,
        });
        const valid1 = createMockBusPositionRaw({
            vid: '  V-002 ',
            rt: ' 51B ',
            lat: '37.1',
            lon: '-122.2',
            hdg: ' 180 ',
            spd: ' 25 ',
            tatripid: '  TRIP-STR  ', // prefer trimmed tatripid
            tripid: 123,
        });

        const result = createBusPositionsFromActRealtime([invalid, valid1, valid2]);

        // Filters invalid and sorts by vehicleId asc
        expect(result).toHaveLength(2);
        expect(result[0].vehicleId).toBe('V-001');
        expect(result[1].vehicleId).toBe('V-002');

        // V-001
        expect(result[0].routeId).toBe('51A');
        expect(result[0].position).toEqual({
            latitude: 37.2,
            longitude: -122.3,
            heading: 90,
            speed: 35,
        });
        expect(result[0].tripId).toBe('789'); // fallback to tripid when tatripid is blank

        // V-002
        expect(result[1].routeId).toBe('51B');
        expect(result[1].position).toEqual({
            latitude: 37.1,
            longitude: -122.2,
            heading: 180,
            speed: 25,
        });
        expect(result[1].tripId).toBe('TRIP-STR'); // prefer trimmed tatripid
    });

    it('sets tripId null when both tatripid and tripid are missing', () => {
        const raw = createMockBusPositionRaw({
            vid: 'V-003',
            rt: '51C',
            lat: '1',
            lon: '2',
            hdg: 1,
            spd: 1,
            tatripid: undefined,
            tripid: undefined,
        });

        const result = createBusPositionsFromActRealtime([raw]);
        expect(result).toHaveLength(1);
        expect(result[0].vehicleId).toBe('V-003');
        expect(result[0].routeId).toBe('51C');
        expect(result[0].tripId).toBeNull();
    });

    it('filters out entries with non-finite numeric fields', () => {
        const bad1 = createMockBusPositionRaw({
            vid: 'V-NAN',
            hdg: 'NaN',
            spd: 10,
        });
        const bad2 = createMockBusPositionRaw({
            vid: 'V-INF',
            lat: 'Infinity',
            lon: undefined,
            hdg: NaN,
        });
        const good = createMockBusPositionRaw({
            vid: 'V-OK',
            lat: '37.3',
            lon: '-122.4',
            hdg: '0.5',
            spd: '10',
        });

        const result = createBusPositionsFromActRealtime([bad1, bad2, good]);
        expect(result.map((r) => r.vehicleId)).toEqual(['V-OK']);
    });
});
