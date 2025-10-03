import DataLoader from 'dataloader';

import { createBusStopProfile, type BusStopProfile } from '../formatters/busStop.js';
import { createBusStopPredictionsFromActRealtime, type BusStopPrediction } from '../formatters/busStopPrediction.js';
import type { ACTRealtimeServiceType } from '../services/actRealtime.js';
import type { BusStopPredictionRaw } from '../services/actRealtime.schemas.js';

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

export type BusStopPredictionsKey = {
    routeId: string;
    stopCode: string;
    direction: 'INBOUND' | 'OUTBOUND';
};

export type BusStopPredictionsLoader = DataLoader<BusStopPredictionsKey, Array<BusStopPrediction>, string>;

export function createBusStopPredictionsLoader(actRealtime: ACTRealtimeServiceType): BusStopPredictionsLoader {
    return new DataLoader<BusStopPredictionsKey, Array<BusStopPrediction>, string>(
        async (keys) => {
            // Group by routeId to pass through to the upstream API for filtering
            const byRoute: Record<string, Set<string>> = {};
            for (const { routeId, stopCode } of keys) {
                byRoute[routeId] ??= new Set<string>();
                byRoute[routeId].add(stopCode);
            }

            const routeKeys = Object.keys(byRoute);
            const resultsByRoute: Record<string, Record<string, Array<BusStopPredictionRaw>>> = {};

            await Promise.all(
                routeKeys.map(async (routeId) => {
                    const stopCodes = Array.from(byRoute[routeId]);
                    const map = await actRealtime.fetchBusStopPredictions(stopCodes, routeId);
                    resultsByRoute[routeId] = map;
                })
            );

            return keys.map(({ routeId, stopCode, direction }) => {
                const predictionsMapForRoute = resultsByRoute[routeId] ?? {};
                const raw = predictionsMapForRoute[stopCode] ?? [];
                const isOutbound = direction === 'OUTBOUND';
                return createBusStopPredictionsFromActRealtime(raw, isOutbound);
            });
        },
        {
            cacheKeyFn: (key) => `${key.routeId}:${key.stopCode}:${key.direction}`,
        }
    );
}
