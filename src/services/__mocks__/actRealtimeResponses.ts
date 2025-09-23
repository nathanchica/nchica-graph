import type {
    BusPositionRaw,
    BusStopApiResponse,
    BusStopPredictionRaw,
    BusStopPredictionsResponse,
    BusStopProfileRaw,
    SystemTimeResponse,
    VehiclePositionsResponse,
} from '../actRealtime.js';

export const createMockBusStopProfileRaw = (overrides?: Partial<BusStopProfileRaw>): BusStopProfileRaw => ({
    stpid: '50373',
    stpnm: 'Broadway & 20th St',
    geoid: '123',
    lat: 37.811845,
    lon: -122.267098,
    ...overrides,
});

export const createMockBusStopPredictionRaw = (overrides?: Partial<BusStopPredictionRaw>): BusStopPredictionRaw => ({
    tmstmp: '20240930 08:15',
    typ: 'A',
    stpnm: 'Broadway & 20th St',
    stpid: '50373',
    vid: '1234',
    dstp: 600,
    rt: '51A',
    rtdd: '51A Broadway',
    rtdir: 'Northbound',
    des: 'Rockridge BART',
    prdtm: '20240930 08:17',
    tatripid: 'TRIP123456',
    prdctdn: '2',
    schdtm: '20240930 08:20',
    seq: 15,
    ...overrides,
});

export const createMockBusPositionRaw = (overrides?: Partial<BusPositionRaw>): BusPositionRaw => ({
    vid: '1234',
    rt: '51A',
    des: 'Rockridge BART',
    tmstmp: '20240930 08:15',
    lat: '37.811845',
    lon: '-122.267098',
    hdg: '180',
    pid: 9876,
    pdist: 12345,
    dly: false,
    spd: 12,
    tablockid: 'BLOCK123',
    tatripid: 'TRIP123456',
    zone: '1',
    mode: 0,
    psgld: 'MED',
    oid: 'OP123',
    or: false,
    blk: 321,
    tripid: 654321,
    tripdyn: 0,
    rtpidatafeed: 'ACT',
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

export const createMockSystemTimeResponse = (overrides?: Partial<SystemTimeResponse>): SystemTimeResponse => {
    const base: SystemTimeResponse = {
        'bustime-response': {
            tm: '20240930 08:15',
        },
    };

    if (!overrides) {
        return base;
    }

    const merged: SystemTimeResponse = {
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
