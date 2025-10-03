import type { BusPositionRaw } from '../services/actRealtime.schemas.js';

export type Position = {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
};

export interface BusPosition {
    vehicleId: string;
    routeId: string;
    position: Position;
    tripId: string | null;
}

function parseFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return null;
        }

        const parsedString = Number(trimmed);
        return Number.isFinite(parsedString) ? parsedString : null;
    }

    const parsedNumber = Number(value);
    return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

function resolveTripId(raw: BusPositionRaw): string | null {
    const trimmedStringTripId = raw.tatripid?.trim();
    if (trimmedStringTripId) {
        return trimmedStringTripId;
    }

    if (raw.tripid !== undefined && raw.tripid !== null) {
        return String(raw.tripid);
    }

    return null;
}

export function createBusPositionsFromActRealtime(rawPositions: Array<BusPositionRaw>): BusPosition[] {
    if (!rawPositions?.length) {
        return [];
    }

    const positions = rawPositions
        .map((rawPosition) => {
            const vehicleId = rawPosition.vid?.trim();
            const routeId = rawPosition.rt?.trim();
            const latitude = parseFiniteNumber(rawPosition.lat);
            const longitude = parseFiniteNumber(rawPosition.lon);
            const heading = parseFiniteNumber(rawPosition.hdg);
            const speed = parseFiniteNumber(rawPosition.spd);

            if (!vehicleId || !routeId || !latitude || !longitude || !heading || !speed) {
                return null;
            }

            const position: BusPosition = {
                vehicleId,
                routeId,
                position: {
                    latitude,
                    longitude,
                    heading,
                    speed,
                },
                tripId: resolveTripId(rawPosition),
            };

            return position;
        })
        .filter((position): position is BusPosition => position !== null)
        .sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));

    return positions;
}
