import { createMockBusStopPredictionRaw } from '../../services/__mocks__/actRealtimeResponses.js';
import { createFeedMessage } from '../../services/__mocks__/gtfsRealtimeResponses.js';
import { createBusStopPredictionsFromActRealtime, createBusStopPredictionsFromGtfsFeed } from '../busStopPrediction.js';

describe('createBusStopPredictionsFromActRealtime', () => {
    it('returns empty array when no predictions', () => {
        const result = createBusStopPredictionsFromActRealtime([], true);
        expect(result).toEqual([]);
    });

    it('filters by outbound flag, enforces required fields, sorts by arrivalTime', () => {
        const p1 = createMockBusStopPredictionRaw({
            rtdir: 'Amtrak', // outbound match (via "amtrak")
            prdtm: '20240701 12:10',
            prdctdn: '5',
            dstp: 123,
            vid: 'V-OUT-1',
            tatripid: 'TRIP-OUT-1',
        });
        const p2 = createMockBusStopPredictionRaw({
            rtdir: 'Away', // outbound match (via "away")
            prdtm: '20240701 12:05',
            prdctdn: '-2', // negative minutes -> clamped to 0
            dstp: Number.POSITIVE_INFINITY, // not finite -> null
            vid: 'V-OUT-2',
            tatripid: 'TRIP-OUT-2',
        });
        const p3 = createMockBusStopPredictionRaw({
            rtdir: 'Rockridge BART', // inbound (does not include amtrak/away)
            prdtm: '20240701 12:20',
            prdctdn: 'Due',
            vid: 'V-IN-1',
            tatripid: 'TRIP-IN-1',
        });
        const p4 = createMockBusStopPredictionRaw({
            rtdir: 'Amtrak',
            prdtm: '20240701 12:00',
            prdctdn: 'abc', // invalid -> 0
            dstp: 456,
            vid: undefined as unknown as string, // missing vid -> filtered out
            tatripid: 'TRIP-OUT-3',
        });
        const p5 = createMockBusStopPredictionRaw({
            rtdir: 'Amtrak',
            prdtm: '' as unknown as string, // missing/empty -> filtered out
            prdctdn: '10',
            vid: 'V-OUT-3',
            tatripid: 'TRIP-OUT-4',
        });

        const result = createBusStopPredictionsFromActRealtime([p1, p2, p3, p4, p5], true);

        // Only p1 and p2 remain (outbound + valid prdtm + vid), sorted by arrivalTime asc (12:05, 12:10)
        expect(result).toHaveLength(2);
        expect(result[0].vehicleId).toBe('V-OUT-2');
        expect(result[0].tripId).toBe('TRIP-OUT-2');
        expect(result[0].arrivalTime.toISOString()).toBe('2024-07-01T19:05:00.000Z');
        expect(result[0].departureTime.toISOString()).toBe('2024-07-01T19:05:00.000Z');
        expect(result[0].minutesAway).toBe(0); // clamped from -2
        expect(result[0].isOutbound).toBe(true);
        expect(result[0].distanceToStopFeet).toBeNull(); // Infinity -> null

        expect(result[1].vehicleId).toBe('V-OUT-1');
        expect(result[1].tripId).toBe('TRIP-OUT-1');
        expect(result[1].arrivalTime.toISOString()).toBe('2024-07-01T19:10:00.000Z');
        expect(result[1].departureTime.toISOString()).toBe('2024-07-01T19:10:00.000Z');
        expect(result[1].minutesAway).toBe(5);
        expect(result[1].isOutbound).toBe(true);
        expect(result[1].distanceToStopFeet).toBe(123);
    });

    it('treats "Due" prdctdn as 0 for outbound predictions', () => {
        const pDue = createMockBusStopPredictionRaw({
            rtdir: 'Amtrak',
            prdtm: '20240701 12:00',
            prdctdn: 'Due',
            vid: 'V-DUE',
            tatripid: 'TRIP-DUE',
        });

        const result = createBusStopPredictionsFromActRealtime([pDue], true);

        expect(result).toHaveLength(1);
        expect(result[0].vehicleId).toBe('V-DUE');
        expect(result[0].tripId).toBe('TRIP-DUE');
        expect(result[0].minutesAway).toBe(0);
        expect(result[0].arrivalTime.toISOString()).toBe('2024-07-01T19:00:00.000Z');
        expect(result[0].departureTime.toISOString()).toBe('2024-07-01T19:00:00.000Z');
        expect(result[0].isOutbound).toBe(true);
    });

    it('treats non-numeric prdctdn as 0 when outbound', () => {
        const pInvalid = createMockBusStopPredictionRaw({
            rtdir: 'Amtrak',
            prdtm: '20240701 12:02',
            prdctdn: 'abc',
            vid: 'V-INV',
            tatripid: 'TRIP-INV',
        });

        const result = createBusStopPredictionsFromActRealtime([pInvalid], true);
        expect(result).toHaveLength(1);
        expect(result[0].minutesAway).toBe(0);
        expect(result[0].arrivalTime.toISOString()).toBe('2024-07-01T19:02:00.000Z');
    });
});

describe('createBusStopPredictionsFromGtfsFeed', () => {
    it('returns empty array when entity is missing', () => {
        const msg = {} as unknown as Parameters<typeof createBusStopPredictionsFromGtfsFeed>[0];
        expect(createBusStopPredictionsFromGtfsFeed(msg, true)).toEqual([]);
    });

    it('flattens stop updates, filters by outbound, ensures times, and sorts by arrivalTime', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-01T00:00:00.000Z');
        vi.setSystemTime(now);
        const nowSec = Math.floor(now.getTime() / 1000);

        const feed = createFeedMessage([
            {
                id: 'e-outbound',
                tripUpdate: {
                    trip: { routeId: '51A', tripId: 'TRIP-1', directionId: 1 },
                    vehicle: { id: 'V-1' },
                    stopTimeUpdate: [
                        // arrival + departure present
                        {
                            stopId: 'STOP-1',
                            arrival: { time: nowSec + 300 }, // 5m
                            departure: { time: nowSec + 360 }, // 6m
                        },
                        // only departure -> arrival should fallback to departure
                        {
                            stopId: 'STOP-2',
                            departure: { time: nowSec + 1200 }, // 20m
                        },
                        // arrival in the past -> minutes clamped to 0
                        {
                            stopId: 'STOP-3',
                            arrival: { time: nowSec - 180 }, // -3m
                        },
                        // missing/empty stopId -> filtered out
                        {
                            stopId: '',
                            arrival: { time: nowSec + 30 },
                        },
                        // no times -> filtered out
                        {
                            stopId: 'STOP-X',
                        },
                    ],
                },
            },
            {
                id: 'e-inbound',
                tripUpdate: {
                    trip: { routeId: '51A', tripId: 'TRIP-2', directionId: 0 },
                    vehicle: { id: 'V-2' },
                    stopTimeUpdate: [{ stopId: 'IN-1', arrival: { time: nowSec + 60 } }],
                },
            },
            // Missing vehicle.id on tripUpdate -> filtered out
            {
                id: 'e-missing-vehicle',
                tripUpdate: {
                    trip: { routeId: '51A', tripId: 'TRIP-3', directionId: 1 },
                    stopTimeUpdate: [{ stopId: 'BAD', arrival: { time: nowSec + 10 } }],
                },
            },
        ]);

        const outbound = createBusStopPredictionsFromGtfsFeed(feed, true);
        expect(outbound.map((o) => o.vehicleId)).toEqual(['V-1', 'V-1', 'V-1']);
        // Sorted by arrivalTime: STOP-3 (past), STOP-1 (5m), STOP-2 (20m)
        expect(outbound[0].tripId).toBe('TRIP-1');
        expect(outbound[0].minutesAway).toBe(0); // clamped from -3
        expect(outbound[0].arrivalTime.toISOString()).toBe('2024-12-31T23:57:00.000Z');
        expect(outbound[0].departureTime.toISOString()).toBe('2024-12-31T23:57:00.000Z');
        expect(outbound[0].isOutbound).toBe(true);
        expect(outbound[0].distanceToStopFeet).toBeNull();

        expect(outbound[1].arrivalTime.toISOString()).toBe('2025-01-01T00:05:00.000Z');
        expect(outbound[1].departureTime.toISOString()).toBe('2025-01-01T00:06:00.000Z');
        expect(outbound[1].minutesAway).toBe(5);
        expect(outbound[1].isOutbound).toBe(true);

        expect(outbound[2].arrivalTime.toISOString()).toBe('2025-01-01T00:20:00.000Z'); // arrival fallback to departure
        expect(outbound[2].departureTime.toISOString()).toBe('2025-01-01T00:20:00.000Z');
        expect(outbound[2].minutesAway).toBe(20);
        expect(outbound[2].isOutbound).toBe(true);

        const inbound = createBusStopPredictionsFromGtfsFeed(feed, false);
        expect(inbound).toHaveLength(1);
        expect(inbound[0].tripId).toBe('TRIP-2');
        expect(inbound[0].vehicleId).toBe('V-2');
        expect(inbound[0].minutesAway).toBe(1);
        expect(inbound[0].isOutbound).toBe(false);

        vi.useRealTimers();
    });

    it('uses empty string when tripId is missing in GTFS entity', () => {
        vi.useFakeTimers();
        const now = new Date('2025-01-02T00:00:00.000Z');
        vi.setSystemTime(now);
        const nowSec = Math.floor(now.getTime() / 1000);

        const feed = createFeedMessage([
            {
                id: 'e-outbound-no-tripid',
                tripUpdate: {
                    trip: { routeId: '51A', directionId: 1 },
                    vehicle: { id: 'V-NT' },
                    stopTimeUpdate: [
                        {
                            stopId: 'STOP-NT',
                            arrival: { time: nowSec + 90 },
                        },
                    ],
                },
            },
        ]);

        const outbound = createBusStopPredictionsFromGtfsFeed(feed, true);
        expect(outbound).toHaveLength(1);
        expect(outbound[0].tripId).toBe('');
        expect(outbound[0].vehicleId).toBe('V-NT');
        expect(outbound[0].minutesAway).toBe(2);

        vi.useRealTimers();
    });
});
