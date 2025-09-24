import GtfsRealtimeBindings, { type transit_realtime } from 'gtfs-realtime-bindings';

import { getCachedOrFetch } from '../utils/cache.js';
import { UpstreamHttpError, UpstreamParseError } from '../utils/error.js';
import { type FetchWithUrlParams } from '../utils/fetch.js';

// Use the protobuf decoder from the default export
const { transit_realtime: rt } = GtfsRealtimeBindings;
const { FeedMessage } = rt;

type IFeedMessage = transit_realtime.IFeedMessage;

export type GTFSRealtimeServiceDependencies = {
    /* Fetch helper for working with URL params */
    fetchWithUrlParams: FetchWithUrlParams;
    /* Token for GTFS realtime API access */
    apiToken: string;
    /* Base URL for GTFS realtime API */
    apiBaseUrl: string;
    /* Cache TTL configuration for GTFS feeds */
    cacheTtl: {
        vehiclePositions: number;
        tripUpdates: number;
        serviceAlerts: number;
    };
    /* Cache utility */
    getCachedOrFetch: typeof getCachedOrFetch;
};

/**
 * GTFS Realtime Service
 * Handles fetching and parsing GTFS-Realtime protocol buffer feeds from AC Transit
 */
class GTFSRealtimeService {
    private readonly baseUrl: string;
    private readonly token: string;
    private readonly fetchWithUrlParams: FetchWithUrlParams;
    private readonly cacheTtl: {
        vehiclePositions: number;
        tripUpdates: number;
        serviceAlerts: number;
    };
    private readonly getCachedOrFetch: typeof getCachedOrFetch;
    private readonly vehiclePositionsPath = '/vehicles';
    private readonly tripUpdatesPath = '/tripupdates';
    private readonly serviceAlertsPath = '/alerts';

    constructor({
        fetchWithUrlParams,
        apiToken,
        apiBaseUrl,
        cacheTtl,
        getCachedOrFetch,
    }: GTFSRealtimeServiceDependencies) {
        this.baseUrl = apiBaseUrl;
        this.token = apiToken;
        this.fetchWithUrlParams = fetchWithUrlParams;
        this.cacheTtl = cacheTtl;
        this.getCachedOrFetch = getCachedOrFetch;
    }

    /**
     * Fetch and parse GTFS-Realtime feed
     */
    private async fetchGTFSFeed(url: string, params?: Record<string, string>): Promise<IFeedMessage> {
        const response = await this.fetchWithUrlParams({
            url,
            params: {
                ...(params ?? {}),
                token: this.token,
            },
        });

        if (!response.ok) {
            throw new UpstreamHttpError(`HTTP error! status: ${response.status}`, {
                status: response.status,
                meta: { source: 'GTFS_RT', url },
            });
        }

        try {
            const buffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            const feed = FeedMessage.decode(uint8Array);
            return feed;
        } catch (error) {
            throw new UpstreamParseError('Failed to parse GTFS feed', {
                meta: { source: 'GTFS_RT', url },
                cause: error,
            });
        }
    }

    /**
     * Filter data for specific route (e.g., '51B')
     */
    private filterByRoute(feed: IFeedMessage, routeId: string): IFeedMessage {
        const filteredEntities = (feed.entity || []).filter((entity) => {
            // Check vehicle positions
            if (entity.vehicle?.trip?.routeId === routeId) {
                return true;
            }
            // Check trip updates
            if (entity.tripUpdate?.trip?.routeId === routeId) {
                return true;
            }
            // Check alerts
            if (entity.alert?.informedEntity?.some((e) => e.routeId === routeId)) {
                return true;
            }
            return false;
        });

        return {
            ...feed,
            entity: filteredEntities,
        };
    }

    /**
     * Fetch vehicle positions for all AC Transit buses (raw feed, uncached)
     */
    private async fetchVehiclePositionsRaw(): Promise<IFeedMessage> {
        const url = `${this.baseUrl}${this.vehiclePositionsPath}`;
        const feed = await this.fetchGTFSFeed(url);
        return feed;
    }

    /**
     * Fetch vehicle positions with caching
     * Cache key includes 'all' since this fetches all routes
     */
    async fetchVehiclePositions(): Promise<IFeedMessage> {
        // Use cache for all vehicle positions
        return this.getCachedOrFetch(`bus:all`, () => this.fetchVehiclePositionsRaw(), this.cacheTtl.vehiclePositions);
    }

    /**
     * Fetch vehicle positions for a specific route with caching
     */
    async fetchVehiclePositionsForRoute(routeId: string): Promise<IFeedMessage> {
        // Get all positions (will use cache if available)
        const allPositions = await this.fetchVehiclePositions();

        // Filter for the specific route
        return this.filterByRoute(allPositions, routeId);
    }

    /**
     * Fetch trip updates (arrival predictions) - raw, uncached
     */
    private async fetchTripUpdatesRaw(): Promise<IFeedMessage> {
        const url = `${this.baseUrl}${this.tripUpdatesPath}`;
        const feed = await this.fetchGTFSFeed(url);
        return feed;
    }

    /**
     * Fetch trip updates with caching
     */
    async fetchTripUpdates(): Promise<IFeedMessage> {
        return this.getCachedOrFetch(`trips:all`, () => this.fetchTripUpdatesRaw(), this.cacheTtl.tripUpdates);
    }

    /**
     * Fetch trip updates for a specific route with caching
     * Optionally filter by stop ID when provided
     */
    async fetchTripUpdatesForRoute(routeId: string, stopId?: string): Promise<IFeedMessage> {
        // Get all trip updates (will use cache if available)
        const allUpdates = await this.fetchTripUpdates();

        // Filter for the specific route first
        const routeFiltered = this.filterByRoute(allUpdates, routeId);

        // Optionally filter by stop ID within the trip updates
        if (!stopId) {
            return routeFiltered;
        }

        const entities = routeFiltered.entity || [];
        const filteredEntities = entities
            .map((entity) => {
                return {
                    ...entity,
                    tripUpdate: entity.tripUpdate
                        ? {
                              ...entity.tripUpdate,
                              stopTimeUpdate:
                                  entity.tripUpdate.stopTimeUpdate?.filter((stu) => stu.stopId === stopId) || [],
                          }
                        : undefined,
                };
            })
            .filter(
                (entity) =>
                    entity.tripUpdate && entity.tripUpdate.stopTimeUpdate && entity.tripUpdate.stopTimeUpdate.length > 0
            );

        return {
            ...routeFiltered,
            entity: filteredEntities,
        };
    }

    /**
     * Fetch service alerts - raw, uncached
     */
    private async fetchServiceAlertsRaw(): Promise<IFeedMessage> {
        const url = `${this.baseUrl}${this.serviceAlertsPath}`;
        const feed = await this.fetchGTFSFeed(url);
        return feed;
    }

    /**
     * Fetch service alerts with caching
     */
    async fetchServiceAlerts(): Promise<IFeedMessage> {
        return this.getCachedOrFetch(`alerts:all`, () => this.fetchServiceAlertsRaw(), this.cacheTtl.serviceAlerts);
    }

    /**
     * Fetch service alerts for a specific route with caching
     */
    async fetchServiceAlertsForRoute(routeId: string): Promise<IFeedMessage> {
        // Get all alerts (will use cache if available)
        const allAlerts = await this.fetchServiceAlerts();

        // Filter for the specific route
        return this.filterByRoute(allAlerts, routeId);
    }
}

export type GTFSRealtimeServiceType = GTFSRealtimeService;

export const createGTFSRealtimeService = (deps: GTFSRealtimeServiceDependencies): GTFSRealtimeServiceType =>
    new GTFSRealtimeService(deps);
