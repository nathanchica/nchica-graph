import GtfsRealtimeBindings, { type transit_realtime } from 'gtfs-realtime-bindings';

const { transit_realtime: rt } = GtfsRealtimeBindings;
const { FeedMessage } = rt;

export type FeedMessageType = transit_realtime.IFeedMessage;
export type FeedEntityType = transit_realtime.IFeedEntity;

export const createFeedMessage = (entities: FeedEntityType[] = []): FeedMessageType => ({
    entity: entities,
    header: {
        gtfsRealtimeVersion: '2.0',
        incrementality: rt.FeedHeader.Incrementality.FULL_DATASET,
        timestamp: Math.floor(Date.now() / 1000),
    },
});

export const createVehicleEntity = (routeId: string): FeedEntityType => ({
    id: `vehicle-${routeId}`,
    vehicle: {
        trip: {
            routeId,
        },
    },
});

export const createTripUpdateEntity = (routeId: string, stopIds: string[] = []): FeedEntityType => ({
    id: `trip-${routeId}`,
    tripUpdate: {
        trip: {
            routeId,
        },
        stopTimeUpdate: stopIds.map((stopId) => ({ stopId })),
    },
});

export const createAlertEntity = (routeId: string): FeedEntityType => ({
    id: `alert-${routeId}`,
    alert: {
        informedEntity: [{ routeId }],
    },
});

export const createFeedArrayBuffer = (feed: FeedMessageType): ArrayBuffer => {
    const encoded = FeedMessage.encode(feed).finish();
    return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
};
