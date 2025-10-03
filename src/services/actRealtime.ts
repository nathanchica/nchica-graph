import invariant from 'tiny-invariant';

import {
    type BusStopProfileRaw,
    BusStopApiResponseSchema,
    type BusStopPredictionRaw,
    BusStopPredictionsResponseSchema,
    SystemTimeResponseSchema,
    type BusPositionRaw,
    VehiclePositionsResponseSchema,
} from './actRealtime.schemas.js';

import { getCachedOrFetch } from '../utils/cache.js';
import { UpstreamHttpError } from '../utils/error.js';
import { type FetchWithUrlParams } from '../utils/fetch.js';

export type ActRealtimeServiceDependencies = {
    /* Fetch function for making API calls */
    fetchWithUrlParams: FetchWithUrlParams;
    /* Token for AC Transit API access */
    apiToken: string;
    /* Base URL for AC Transit API */
    apiBaseUrl: string;
    /* Cache TTL settings for different data types */
    cacheTtl: {
        busStopProfiles: number;
        predictions: number;
        vehiclePositions: number;
    };
    /* Caching utility function */
    getCachedOrFetch: typeof getCachedOrFetch;
};

/**
 * ACT Realtime Service
 * Handles fetching data from AC Transit's proprietary REST API
 * This includes stop profiles, predictions, and other real-time data
 */
class ACTRealtimeService {
    private readonly baseUrl: string;
    private readonly token: string;
    private readonly fetchWithUrlParams: FetchWithUrlParams;
    private readonly cacheTtl: {
        busStopProfiles: number;
        predictions: number;
        vehiclePositions: number;
    };
    private readonly getCachedOrFetch: typeof getCachedOrFetch;

    private readonly busStopProfilePath = '/stop';
    private readonly busStopPredictionsPath = '/prediction';
    private readonly vehiclePositionsPath = '/vehicle';
    private readonly systemTimePath = '/time';
    private readonly maxBusStopsPerRequest = 10;

    constructor({
        fetchWithUrlParams,
        apiToken,
        apiBaseUrl,
        cacheTtl,
        getCachedOrFetch,
    }: ActRealtimeServiceDependencies) {
        this.baseUrl = apiBaseUrl;
        this.token = apiToken;
        this.fetchWithUrlParams = fetchWithUrlParams;
        this.cacheTtl = cacheTtl;
        this.getCachedOrFetch = getCachedOrFetch;
    }

    /**
     * Fetch bus stop profiles from stop codes using AC Transit REST API batch endpoint (raw, no caching)
     * @param stopCodes Array of 5-digit stop codes (max 10 per request)
     * @returns Object mapping stop_code to BusStopProfileRaw
     */
    private async fetchBusStopProfilesRaw(stopCodes: string[]): Promise<Record<string, BusStopProfileRaw>> {
        invariant(
            stopCodes.length > 0 && stopCodes.length <= this.maxBusStopsPerRequest,
            'stopCodes length should be validated by fetchBusStopProfiles'
        );

        const profiles: Record<string, BusStopProfileRaw> = {};

        const url = `${this.baseUrl}${this.busStopProfilePath}`;
        const response = await this.fetchWithUrlParams({
            url,
            params: { stpid: stopCodes.join(','), token: this.token },
            requestInit: {
                headers: {
                    Accept: 'application/json',
                },
            },
        });

        if (!response.ok) {
            throw new UpstreamHttpError(`HTTP error! status: ${response.status}`, {
                status: response.status,
                meta: { source: 'ACT_REALTIME', url },
            });
        }

        const json = await response.json();
        const parsed = BusStopApiResponseSchema.safeParse(json);
        if (!parsed.success) {
            return profiles;
        }

        const stops = parsed.data['bustime-response'].stops;
        if (stops.length === 0) {
            return profiles;
        }

        stopCodes.forEach((stopCode) => {
            const profile = stops.find((stop) => stop.stpid === stopCode);
            if (profile) {
                profiles[stopCode] = profile;
            }
        });

        return profiles;
    }

    /**
     * Fetch bus stop profiles for multiple stop codes with caching and batching
     * @param stopCodes Array of 5-digit stop codes
     * @returns Object mapping stop_code to BusStopProfileRaw
     */
    async fetchBusStopProfiles(stopCodes: string[]): Promise<Record<string, BusStopProfileRaw>> {
        const profiles: Record<string, BusStopProfileRaw> = {};

        if (stopCodes.length === 0) {
            return profiles;
        }

        // Split into chunks (AC Transit API limit) using array methods
        const chunkSize = this.maxBusStopsPerRequest;
        const chunks = Array.from({ length: Math.ceil(stopCodes.length / chunkSize) }, (_, index) =>
            stopCodes.slice(index * chunkSize, (index + 1) * chunkSize)
        );

        // Process chunks in parallel with caching
        const promises = chunks.map(async (chunk) => {
            // Create a cache key for this batch
            const cacheKey = `bus-stop-profiles:${chunk.sort().join(',')}`;

            const chunkMap = await this.getCachedOrFetch(
                cacheKey,
                () => this.fetchBusStopProfilesRaw(chunk),
                this.cacheTtl.busStopProfiles
            );

            // Merge results into main map using forEach
            if (chunkMap) {
                Object.entries(chunkMap).forEach(([code, profile]) => {
                    profiles[code] = profile;
                });
            }
        });

        await Promise.all(promises);

        return profiles;
    }

    /**
     * Fetch predictions for multiple stops from AC Transit REST API (raw, no caching)
     * @param stopCodes Array of 5-digit stop codes (max 10 per request)
     * @returns Object mapping stop_code to predictions response
     */
    private async fetchBusStopPredictionsRaw(
        stopCodes: string[],
        routeId?: string
    ): Promise<Record<string, Array<BusStopPredictionRaw>>> {
        invariant(
            stopCodes.length > 0 && stopCodes.length <= this.maxBusStopsPerRequest,
            'stopCodes length should be validated by fetchBusStopPredictions'
        );

        const predictionsMap: Record<string, Array<BusStopPredictionRaw>> = {};

        const url = `${this.baseUrl}${this.busStopPredictionsPath}`;
        // Note: AC Transit confusingly calls stop_code "stpid"
        const response = await this.fetchWithUrlParams({
            url,
            params: { stpid: stopCodes.join(','), ...(routeId ? { rt: routeId } : {}), token: this.token },
            requestInit: {
                headers: {
                    Accept: 'application/json',
                },
            },
        });

        if (!response.ok) {
            throw new UpstreamHttpError(`HTTP error! status: ${response.status}`, {
                status: response.status,
                meta: { source: 'ACT_REALTIME', url },
            });
        }

        const json = await response.json();
        const parsed = BusStopPredictionsResponseSchema.safeParse(json);
        if (!parsed.success) {
            return predictionsMap;
        }

        const predictions = parsed.data['bustime-response'].prd;

        // If API returns `prd: null`, ensure we return empty arrays per requested stop
        if (predictions === null) {
            stopCodes.forEach((stopCode) => {
                predictionsMap[stopCode] = [];
            });
            return predictionsMap;
        }

        // Otherwise, filter predictions by stop code
        stopCodes.forEach((stopCode) => {
            predictionsMap[stopCode] = predictions.filter((p) => p.stpid === stopCode);
        });

        return predictionsMap;
    }

    /**
     * Fetch predictions for multiple stops with caching and batching
     * @param stopCodes Array of 5-digit stop codes
     * @returns Object mapping stop_code to predictions response
     */
    async fetchBusStopPredictions(
        stopCodes: string[],
        routeId?: string
    ): Promise<Record<string, Array<BusStopPredictionRaw>>> {
        const predictionsMap: Record<string, Array<BusStopPredictionRaw>> = {};

        if (stopCodes.length === 0) {
            return predictionsMap;
        }

        // Split into chunks (AC Transit API limit)
        const chunkSize = this.maxBusStopsPerRequest;
        const chunks = Array.from({ length: Math.ceil(stopCodes.length / chunkSize) }, (_, index) =>
            stopCodes.slice(index * chunkSize, (index + 1) * chunkSize)
        );

        // Process chunks in parallel with caching
        const promises = chunks.map(async (chunk) => {
            const cacheKey = `bus-stop-predictions:${routeId ?? 'all'}:${chunk.sort().join(',')}`;

            const chunkMap = await this.getCachedOrFetch(
                cacheKey,
                () => this.fetchBusStopPredictionsRaw(chunk, routeId),
                this.cacheTtl.predictions
            );

            // Merge results into main map
            if (chunkMap) {
                Object.entries(chunkMap).forEach(([code, predictions]) => {
                    predictionsMap[code] = predictions;
                });
            }
        });

        await Promise.all(promises);

        return predictionsMap;
    }

    /**
     * Fetch the current AC Transit system time without caching
     */
    async fetchSystemTime(): Promise<Date> {
        const now = Date.now();
        let timestampMs = now;

        try {
            const response = await this.fetchWithUrlParams({
                url: `${this.baseUrl}${this.systemTimePath}`,
                params: { unixTime: 'true', token: this.token },
                requestInit: {
                    headers: {
                        Accept: 'application/json',
                    },
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error fetching system time! status: ${response.status}`);
            }

            const json = await response.json();
            const parsed = SystemTimeResponseSchema.safeParse(json);
            if (!parsed.success) {
                const msg = parsed.error.issues[0]?.message;
                const message = msg?.startsWith('Invalid AC Transit system time value')
                    ? msg
                    : 'AC Transit system time response missing timestamp';
                throw new Error(message);
            }
            timestampMs = parsed.data['bustime-response'].tm;
        } catch (error) {
            // Fallback to server time on error
            timestampMs = now;
            console.error(
                `Error fetching AC Transit system time: ${error instanceof Error ? error.message /* v8 ignore next */ : error}`
            );
        }

        return new Date(timestampMs);
    }

    /**
     * Fetch vehicle positions (raw, no caching)
     * @param routeId Optional route ID to filter by
     * @returns Array of BusPositionRaw
     */
    private async fetchBusPositionsRaw(routeId?: string): Promise<Array<BusPositionRaw>> {
        const url = `${this.baseUrl}${this.vehiclePositionsPath}`;
        const response = await this.fetchWithUrlParams({
            url,
            params: {
                ...(routeId ? { rt: routeId } : {}),
                token: this.token,
            },
            requestInit: {
                headers: {
                    Accept: 'application/json',
                },
            },
        });

        if (!response.ok) {
            throw new UpstreamHttpError(`HTTP error! status: ${response.status}`, {
                status: response.status,
                meta: { source: 'ACT_REALTIME', url },
            });
        }

        const json = await response.json();
        const parsed = VehiclePositionsResponseSchema.safeParse(json);
        if (!parsed.success) {
            return [];
        }
        const vehicles = parsed.data?.['bustime-response']?.vehicle;

        if (!vehicles || vehicles.length === 0) {
            return [];
        }

        return vehicles;
    }

    /**
     * Fetch vehicle positions with caching
     * @param routeId Optional route ID to filter by
     * @returns Array of BusPositionRaw
     */
    async fetchBusPositions(routeId?: string): Promise<Array<BusPositionRaw>> {
        const cacheKey = `vehicle-positions:${routeId ?? 'all'}`;

        let positions: Array<BusPositionRaw> = [];

        positions = await this.getCachedOrFetch(
            cacheKey,
            () => this.fetchBusPositionsRaw(routeId),
            this.cacheTtl.vehiclePositions
        );

        return positions;
    }
}

export type ACTRealtimeServiceType = ACTRealtimeService;

export const createACTRealtimeService = (deps: ActRealtimeServiceDependencies): ACTRealtimeServiceType =>
    new ACTRealtimeService(deps);
