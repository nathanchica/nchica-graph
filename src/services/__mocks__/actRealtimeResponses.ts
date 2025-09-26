import type {
    BusPositionRaw,
    BusStopApiResponse,
    BusStopPredictionRaw,
    BusStopPredictionsResponse,
    BusStopProfileRaw,
    VehiclePositionsResponse,
} from '../actRealtime.schemas.js';

export const createMockBusStopProfileRaw = (overrides?: Partial<BusStopProfileRaw>): BusStopProfileRaw => ({
    stpid: '50373',
    stpnm: 'Broadway & 20th St',
    geoid: '123',
    lat: 37.811845,
    lon: -122.267098,
    ...overrides,
});

export const createMockBusStopPredictionRaw = (overrides?: Partial<BusStopPredictionRaw>): BusStopPredictionRaw => ({
    stpid: '50373',
    vid: '1234',
    dstp: 600,
    rtdir: 'Northbound',
    prdtm: '20240930 08:17',
    tatripid: 'TRIP123456',
    prdctdn: '2',
    ...overrides,
});

export const createMockBusPositionRaw = (overrides?: Partial<BusPositionRaw>): BusPositionRaw => ({
    vid: '1234',
    rt: '51A',
    tmstmp: '20240930 08:15',
    lat: '37.811845',
    lon: '-122.267098',
    hdg: '180',
    spd: 12,
    tatripid: 'TRIP123456',
    tripid: 654321,
    ...overrides,
});

export const createMockBusStopApiResponse = (overrides?: Partial<BusStopApiResponse>): BusStopApiResponse => {
    const base: BusStopApiResponse = {
        'bustime-response': {
            stops: [createMockBusStopProfileRaw()],
        },
    };

    if (!overrides) {
        return base;
    }

    const merged: BusStopApiResponse = {
        ...base,
        ...overrides,
    };

    if (overrides['bustime-response']) {
        merged['bustime-response'] = {
            ...base['bustime-response'],
            ...overrides['bustime-response'],
        };
    }

    return merged;
};

export const createMockBusStopPredictionsResponse = (
    overrides?: Partial<BusStopPredictionsResponse>
): BusStopPredictionsResponse => {
    const base: BusStopPredictionsResponse = {
        'bustime-response': {
            prd: [createMockBusStopPredictionRaw()],
        },
    };

    if (!overrides) {
        return base;
    }

    const merged: BusStopPredictionsResponse = {
        ...base,
        ...overrides,
    };

    if (overrides['bustime-response']) {
        merged['bustime-response'] = {
            ...base['bustime-response'],
            ...overrides['bustime-response'],
        };
    }

    return merged;
};

export const createMockVehiclePositionsResponse = (
    overrides?: Partial<VehiclePositionsResponse>
): VehiclePositionsResponse => {
    const base: VehiclePositionsResponse = {
        'bustime-response': {
            vehicle: [createMockBusPositionRaw()],
        },
    };

    if (!overrides) {
        return base;
    }

    const merged: VehiclePositionsResponse = {
        ...base,
        ...overrides,
    };

    if (overrides['bustime-response']) {
        merged['bustime-response'] = {
            ...base['bustime-response'],
            ...overrides['bustime-response'],
        };
    }

    return merged;
};
