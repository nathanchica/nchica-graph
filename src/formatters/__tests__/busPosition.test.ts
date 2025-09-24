import { createMockBusPositionRaw } from '../../services/__mocks__/actRealtimeResponses.js';
import { createFeedMessage } from '../../services/__mocks__/gtfsRealtimeResponses.js';
import { createBusPositionsFromActRealtime, createBusPositionsFromGtfsFeed } from '../busPosition.js';

describe('createBusPositionsFromActRealtime', () => {
    it('parses valid raw positions, converts speed mph->m/s, resolves tripId preference, tripId null fallback, and sorts by vehicleId', () => {
        const p1 = createMockBusPositionRaw({
            vid: 'A-2',
            rt: '51A',
            lat: '37.0000',
            lon: '-122.0000',
            spd: 12, // mph -> 5.36448 m/s
            hdg: '180',
            tatripid: 'TRIP-A',
            tmstmp: '20240701 09:00',
        });
        const p2 = createMockBusPositionRaw({
            vid: 'A-1',
            rt: '51B',
            lat: '36.5000',
            lon: '-121.5000',
            spd: undefined, // speed missing -> null
            hdg: undefined, // heading missing -> null
            tatripid: undefined, // prefer numeric tripid when string missing
            tripid: 2468,
            tmstmp: '20240701 09:05',
        });
        const p3 = createMockBusPositionRaw({
            vid: 'A-3',
            rt: '51C',
            lat: '35.0000',
            lon: '-120.9000',
            spd: 0,
            hdg: '0',
            tatripid: undefined,
            tripid: undefined,
            tmstmp: '20240701 09:10',
        });
        const invalid = createMockBusPositionRaw({ vid: 'BAD', rt: '51A', lat: '', lon: '-122.1' }); // invalid lat -> filtered out

        const result = createBusPositionsFromActRealtime([p1, p2, p3, invalid]);

        expect(result).toHaveLength(3);
        // Sorted by vehicleId: A-1, A-2, A-3
        expect(result[0].vehicleId).toBe('A-1');
        expect(result[0].routeId).toBe('51B');
        expect(result[0].latitude).toBeCloseTo(36.5, 6);
        expect(result[0].longitude).toBeCloseTo(-121.5, 6);
        expect(result[0].heading).toBeNull();
        expect(result[0].speed).toBeNull();
        expect(result[0].tripId).toBe('2468');
        expect(result[0].stopSequence).toBeNull();

        expect(result[1].vehicleId).toBe('A-2');
        expect(result[1].routeId).toBe('51A');
        expect(result[1].heading).toBe(180);
        expect(result[1].speed).toBeCloseTo(12 * 0.44704, 5);
        expect(result[1].tripId).toBe('TRIP-A');
        expect(result[1].stopSequence).toBeNull();

        expect(result[2].vehicleId).toBe('A-3');
        expect(result[2].tripId).toBeNull();
        expect(result[2].speed).toBeCloseTo(0, 6);
    });

    it('returns empty when inputs are missing or invalid', () => {
        const noRoute = createMockBusPositionRaw({ vid: 'X', rt: '   ' });
        const noVehicle = createMockBusPositionRaw({ vid: '   ' });
        const noCoords = createMockBusPositionRaw({ lat: '', lon: '' });
        const result = createBusPositionsFromActRealtime([noRoute, noVehicle, noCoords]);
        expect(result).toEqual([]);
    });

    it('returns empty for empty or undefined input arrays', () => {
        expect(createBusPositionsFromActRealtime([])).toEqual([]);
        expect(
            createBusPositionsFromActRealtime(
                undefined as unknown as Parameters<typeof createBusPositionsFromActRealtime>[0]
            )
        ).toEqual([]);
    });

    it('treats non-finite numeric strings as null (ACT speed)', () => {
        const p = createMockBusPositionRaw({
            vid: 'NF-1',
            rt: '51N',
            lat: '34.0000',
            lon: '-121.0000',
            spd: 'Infinity' as unknown as number, // string path -> Number('Infinity') is not finite
            hdg: '90',
            tmstmp: '20240701 10:00',
        });

        const [pos] = createBusPositionsFromActRealtime([p]);
        expect(pos.vehicleId).toBe('NF-1');
        expect(pos.speed).toBeNull();
    });
});

describe('createBusPositionsFromGtfsFeed', () => {
    it('parses valid entities, rounds stopSequence, picks vehicleId from descriptor or entity id, uses timestamps, and sorts by vehicleId', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T00:00:00.000Z');
        vi.setSystemTime(now);
        const nowSec = Math.floor(now.getTime() / 1000);

        const feed = createFeedMessage([
            // Uses vehicle.vehicle.id and vehicle.timestamp
            {
                id: 'entity-B',
                vehicle: {
                    trip: { routeId: '51A', tripId: 'TRIP-G1' },
                    position: { latitude: 37.1, longitude: -122.2, bearing: 270, speed: 7.5 },
                    currentStopSequence: 12.7, // rounds to 13
                    vehicle: { id: 'B-2' },
                    timestamp: nowSec - 45,
                },
            },
            // Missing vehicle.vehicle.id -> falls back to entity.id; missing vehicle.timestamp -> uses header timestamp
            {
                id: 'A-1',
                vehicle: {
                    trip: { routeId: '51B', tripId: 'TRIP-G2' },
                    position: { latitude: 37.2, longitude: -122.3 },
                    currentStopSequence: 17,
                },
            },
            // Invalid/missing cases filtered out
            { id: 'no-vehicle' },
            { id: 'no-route', vehicle: { position: { latitude: 1, longitude: 2 } } },
            { id: 'bad-coords', vehicle: { trip: { routeId: '51A' }, position: { latitude: NaN, longitude: -10 } } },
        ]);

        const result = createBusPositionsFromGtfsFeed(feed);

        // Expected two valid positions sorted by vehicleId: 'A-1' (fallback to entity id), 'B-2'
        expect(result).toHaveLength(2);
        expect(result[0].vehicleId).toBe('A-1');
        expect(result[0].routeId).toBe('51B');
        expect(result[0].latitude).toBeCloseTo(37.2, 6);
        expect(result[0].longitude).toBeCloseTo(-122.3, 6);
        expect(result[0].heading).toBeNull();
        expect(result[0].speed).toBeNull();
        expect(result[0].tripId).toBe('TRIP-G2');
        expect(result[0].stopSequence).toBe(17);
        expect(result[0].timestamp.toISOString()).toBe(now.toISOString()); // header timestamp

        expect(result[1].vehicleId).toBe('B-2');
        expect(result[1].routeId).toBe('51A');
        expect(result[1].heading).toBe(270);
        expect(result[1].speed).toBe(7.5);
        expect(result[1].tripId).toBe('TRIP-G1');
        expect(result[1].stopSequence).toBe(13);
        expect(result[1].timestamp.toISOString()).toBe(new Date((nowSec - 45) * 1000).toISOString());

        vi.useRealTimers();
    });

    it('returns empty array when no valid entities', () => {
        const feed = createFeedMessage([{ id: 'only-alert', alert: { informedEntity: [{ routeId: '51A' }] } }]);
        expect(createBusPositionsFromGtfsFeed(feed)).toEqual([]);
    });

    it('returns empty array when entity is empty or missing', () => {
        const emptyFeed = createFeedMessage([]);
        expect(createBusPositionsFromGtfsFeed(emptyFeed)).toEqual([]);

        const missingEntity = {} as unknown as Parameters<typeof createBusPositionsFromGtfsFeed>[0];
        expect(createBusPositionsFromGtfsFeed(missingEntity)).toEqual([]);
    });

    it('covers fallback branches: timestamp fallback to now, vehicleId empty path, null tripId and stopSequence, and non-finite numeric parsing', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-03T00:00:00.000Z');
        vi.setSystemTime(now);

        const feed = createFeedMessage([
            // Valid entity but without tripId/stopSequence, Infinity speed (non-finite number), and no vehicle.timestamp
            {
                id: 'D-1',
                vehicle: {
                    trip: { routeId: '51D' },
                    position: {
                        latitude: 40.1 as unknown as number,
                        longitude: -120.1 as unknown as number,
                        speed: Number.POSITIVE_INFINITY as unknown as number,
                    },
                    vehicle: { id: 'D-1' },
                },
            },
        ]);

        // Break header timestamp so resolveTimestamp falls back to Date.now()
        feed.header!.timestamp = undefined as unknown as number;

        const result = createBusPositionsFromGtfsFeed(feed);

        expect(result).toHaveLength(1);
        const d1 = result[0];
        expect(d1.vehicleId).toBe('D-1');
        expect(d1.tripId).toBeNull(); // trip.tripId missing
        expect(d1.stopSequence).toBeNull(); // currentStopSequence missing
        expect(d1.speed).toBeNull(); // Infinity -> non-finite -> null
        expect(d1.timestamp.toISOString()).toBe(now.toISOString()); // fallback to now

        vi.useRealTimers();
    });

    it('parses numeric strings (with whitespace) via parseFiniteNumber for GTFS fields', () => {
        const nowSec = Math.floor(Date.now() / 1000);

        const feed = createFeedMessage([
            {
                id: 'S-1',
                vehicle: {
                    trip: { routeId: '51S', tripId: 'TRIP-S' },
                    // cast to exercise string branch in parseFiniteNumber
                    position: {
                        latitude: ' 37.300 ' as unknown as number,
                        longitude: ' -122.400 ' as unknown as number,
                        bearing: ' 123 ' as unknown as number,
                        speed: ' 15.2 ' as unknown as number,
                    },
                    currentStopSequence: ' 4.4 ' as unknown as number, // rounds to 4
                    vehicle: { id: 'S-1' },
                    timestamp: nowSec - 30,
                },
            },
        ]);

        const [pos] = createBusPositionsFromGtfsFeed(feed);
        expect(pos.vehicleId).toBe('S-1');
        expect(pos.routeId).toBe('51S');
        expect(pos.latitude).toBeCloseTo(37.3, 6);
        expect(pos.longitude).toBeCloseTo(-122.4, 6);
        expect(pos.heading).toBe(123);
        expect(pos.speed).toBeCloseTo(15.2, 6);
        expect(pos.stopSequence).toBe(4);
    });
});
