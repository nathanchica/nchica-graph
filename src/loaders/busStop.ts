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
                const routeKey = routeId ?? 'all';
                byRoute[routeKey] ??= new Set<string>();
                byRoute[routeKey].add(stopCode);
            }

            const routeKeys = Object.keys(byRoute);
            const resultsByRoute: Record<string, Record<string, Array<BusStopPredictionRaw>>> = {};

            await Promise.all(
                routeKeys.map(async (routeKey) => {
                    const stopCodes = Array.from(byRoute[routeKey]);
                    const routeParam = routeKey === 'all' || routeKey === '' ? undefined : routeKey;
                    const map = await actRealtime.fetchBusStopPredictions(stopCodes, routeParam);
                    resultsByRoute[routeKey] = map;
                })
            );

            return keys.map((key) => {
                const routeKey = key.routeId ?? 'all';
                const predictionsMapForRoute = resultsByRoute[routeKey] ?? {};
                const raw = predictionsMapForRoute[key.stopCode] ?? [];
                const isOutbound = key.direction === 'OUTBOUND';
                return createBusStopPredictionsFromActRealtime(raw, isOutbound);
            });
        },
        {
            cacheKeyFn: (key) => `${key.routeId}:${key.stopCode}:${key.direction}`,
        }
    );
}
