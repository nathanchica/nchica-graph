import { vi } from 'vitest';

import { createBusPositionsFromActRealtime } from '../../formatters/busPosition.js';
import { createMockACTRealtimeService } from '../../services/__mocks__/actRealtime.js';
import { createMockBusPositionRaw } from '../../services/__mocks__/actRealtimeResponses.js';
import { createBusPositionsByRouteLoader } from '../busPosition.js';

describe('createBusPositionsByRouteLoader', () => {
    it('returns formatted positions for a route', async () => {
        const routeId = '51B';
        const raw = [
            createMockBusPositionRaw({ vid: 'V-1', rt: routeId, lat: '37.1', lon: '-122.1', hdg: '45', spd: 12 }),
            createMockBusPositionRaw({ vid: 'V-2', rt: routeId, lat: '37.2', lon: '-122.2', hdg: '90', spd: 18 }),
        ];

        const fetchBusPositions = vi.fn().mockResolvedValue(raw);
        const actRealtime = createMockACTRealtimeService({ fetchBusPositions });

        const loader = createBusPositionsByRouteLoader(actRealtime);
        const result = await loader.load(routeId);

        expect(result).toEqual(createBusPositionsFromActRealtime(raw));
        expect(fetchBusPositions).toHaveBeenCalledTimes(1);
        expect(fetchBusPositions).toHaveBeenCalledWith(routeId);
    });

    it('returns empty array when upstream returns empty', async () => {
        const routeId = '6';
        const fetchBusPositions = vi.fn().mockResolvedValue([]);
        const actRealtime = createMockACTRealtimeService({ fetchBusPositions });

        const loader = createBusPositionsByRouteLoader(actRealtime);
        const result = await loader.load(routeId);

        expect(result).toEqual([]);
        expect(fetchBusPositions).toHaveBeenCalledTimes(1);
        expect(fetchBusPositions).toHaveBeenCalledWith(routeId);
    });

    it('handles multiple routes in a single batch', async () => {
        const a = '1';
        const b = '2';
        const rawA = [createMockBusPositionRaw({ vid: 'A-1', rt: a, lat: '37.0', lon: '-122.0' })];
        const rawB = [createMockBusPositionRaw({ vid: 'B-1', rt: b, lat: '38.0', lon: '-123.0' })];

        const fetchBusPositions = vi.fn().mockResolvedValueOnce(rawA).mockResolvedValueOnce(rawB);
        const actRealtime = createMockACTRealtimeService({ fetchBusPositions });

        const loader = createBusPositionsByRouteLoader(actRealtime);
        const [resA, resB] = await loader.loadMany([a, b]);

        expect(resA).toEqual(createBusPositionsFromActRealtime(rawA));
        expect(resB).toEqual(createBusPositionsFromActRealtime(rawB));
        expect(fetchBusPositions).toHaveBeenCalledTimes(2);
        expect(fetchBusPositions).toHaveBeenNthCalledWith(1, a);
        expect(fetchBusPositions).toHaveBeenNthCalledWith(2, b);
    });
});
