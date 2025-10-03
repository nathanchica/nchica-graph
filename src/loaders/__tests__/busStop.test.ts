import { createBusStopProfile } from '../../formatters/busStop.js';
import { createMockACTRealtimeService } from '../../services/__mocks__/actRealtime.js';
import { createMockBusStopProfileRaw } from '../../services/__mocks__/actRealtimeResponses.js';
import { createBusStopByCodeLoader, createBusStopPredictionsLoader } from '../busStop.js';

describe('busStop loaders', () => {
    describe('createBusStopPredictionsLoader', () => {
        it('falls back to empty map/array when upstream returns undefined (covers defaults)', async () => {
            const routeId = '51B';
            const stopCode = '50373';

            const fetchBusStopPredictions = vi.fn().mockResolvedValue(undefined);
            const actRealtime = createMockACTRealtimeService({ fetchBusStopPredictions });

            const loader = createBusStopPredictionsLoader(actRealtime);

            const result = await loader.load({ routeId, stopCode, direction: 'OUTBOUND' });

            // Should gracefully default to [] when no entry for route/stop exists
            expect(result).toEqual([]);

            // Ensure upstream was called with grouped params
            expect(fetchBusStopPredictions).toHaveBeenCalledTimes(1);
            expect(fetchBusStopPredictions).toHaveBeenCalledWith([stopCode], routeId);
        });
    });

    describe('createBusStopByCodeLoader', () => {
        it('returns formatted profile for existing code', async () => {
            const code = '55555';
            const raw = createMockBusStopProfileRaw({ stpid: code, geoid: 'GTFS_55555', stpnm: 'Test Stop' });

            const fetchBusStopProfiles = vi.fn().mockResolvedValue({ [code]: raw });
            const actRealtime = createMockACTRealtimeService({ fetchBusStopProfiles });

            const loader = createBusStopByCodeLoader(actRealtime);
            const result = await loader.load(code);

            expect(result).toEqual(createBusStopProfile(raw));
            expect(fetchBusStopProfiles).toHaveBeenCalledTimes(1);
            expect(fetchBusStopProfiles).toHaveBeenCalledWith([code]);
        });

        it('returns null when profile is missing', async () => {
            const code = '99999';
            const fetchBusStopProfiles = vi.fn().mockResolvedValue({});
            const actRealtime = createMockACTRealtimeService({ fetchBusStopProfiles });

            const loader = createBusStopByCodeLoader(actRealtime);
            const result = await loader.load(code);

            expect(result).toBeNull();
            expect(fetchBusStopProfiles).toHaveBeenCalledTimes(1);
            expect(fetchBusStopProfiles).toHaveBeenCalledWith([code]);
        });

        it('batches multiple codes in single fetch call via loadMany', async () => {
            const codeA = '11111';
            const codeB = '22222';
            const rawA = createMockBusStopProfileRaw({ stpid: codeA, geoid: 'GTFS_A', stpnm: 'Stop A' });
            const rawB = createMockBusStopProfileRaw({ stpid: codeB, geoid: 'GTFS_B', stpnm: 'Stop B' });

            const fetchBusStopProfiles = vi.fn().mockResolvedValue({ [codeA]: rawA, [codeB]: rawB });
            const actRealtime = createMockACTRealtimeService({ fetchBusStopProfiles });

            const loader = createBusStopByCodeLoader(actRealtime);
            const results = await loader.loadMany([codeA, codeB]);

            expect(results).toEqual([createBusStopProfile(rawA), createBusStopProfile(rawB)]);
            expect(fetchBusStopProfiles).toHaveBeenCalledTimes(1);
            expect(fetchBusStopProfiles).toHaveBeenCalledWith([codeA, codeB]);
        });
    });
});
