import { z } from 'zod';

export const BusStopProfileRawSchema = z.looseObject({
    stpid: z.string().describe('Stop code (5-digit)'),
    stpnm: z.string().describe('Stop name'),
    geoid: z.string().describe('GTFS stop_id'),
    lat: z.coerce.number().describe('Latitude'),
    lon: z.coerce.number().describe('Longitude'),
});

/**
 * ACT bus stop profile objects
 */
export type BusStopProfileRaw = z.infer<typeof BusStopProfileRawSchema>;

export const BusStopApiResponseSchema = z
    .looseObject({
        'bustime-response': z
            .looseObject({
                stops: z.array(BusStopProfileRawSchema).describe('List of stop profiles'),
            })
            .describe('AC Transit BusTime envelope (stop profiles)'),
    })
    .describe('AC Transit stop profile API response');

/**
 * Response type for GET actrealtime/stop?rt={rt}&dir={dir}&stpid={stpid}&callback={callback}
 */
export type BusStopApiResponse = z.infer<typeof BusStopApiResponseSchema>;

export const BusStopPredictionRawSchema = z.looseObject({
    stpid: z.string().describe('Stop ID (5-digit stop code, not GTFS stop_id)'),
    vid: z.string().describe('Vehicle ID'),
    dstp: z.coerce.number().describe('Distance to stop (in feet)'),
    rtdir: z.string().describe('Route direction description'),
    prdtm: z.string().describe('Predicted time "YYYYMMDD HH:MM"'),
    tatripid: z.string().describe('Trip ID'),
    prdctdn: z.string().describe('Countdown — "Due" or number of minutes'),
});

/**
 * ACT bus stop prediction objects
 */
export type BusStopPredictionRaw = z.infer<typeof BusStopPredictionRawSchema>;

export const BusStopPredictionsResponseSchema = z
    .looseObject({
        'bustime-response': z
            .looseObject({
                prd: z.array(BusStopPredictionRawSchema).nullable().describe('Predictions array or null'),
            })
            .describe('AC Transit BusTime envelope (predictions)'),
    })
    .describe('AC Transit bus stop predictions API response');

/**
 * Response type for GET actrealtime/prediction?stpid={stpid}&rt={rt}&vid={vid}&top={top}&tmres={tmres}&callback={callback}&showocprd={showocprd}
 */
export type BusStopPredictionsResponse = z.infer<typeof BusStopPredictionsResponseSchema>;

export const SystemTimeResponseSchema = z
    .looseObject({
        'bustime-response': z
            .looseObject({
                tm: z
                    .string()
                    .transform((s, ctx) => {
                        const trimmed = s?.trim?.();
                        if (!trimmed) {
                            ctx.addIssue({
                                code: 'custom',
                                message: 'AC Transit system time response missing timestamp',
                            });
                            return z.NEVER;
                        }
                        const number = Number.parseInt(trimmed, 10);
                        if (!Number.isFinite(number) || number <= 0) {
                            ctx.addIssue({
                                code: 'custom',
                                message: `Invalid AC Transit system time value: ${s}`,
                            });
                            return z.NEVER;
                        }
                        return number;
                    })
                    .describe('Unix timestamp in ms (string), validated to number'),
            })
            .describe('AC Transit BusTime envelope (system time)'),
    })
    .describe('AC Transit system time API response');

/**
 * Response type for GET actrealtime/time?unixTime={unixTime}&callback={callback}
 */
export type SystemTimeResponse = z.infer<typeof SystemTimeResponseSchema>;

export const BusPositionRawSchema = z.looseObject({
    vid: z.string().describe('Vehicle ID'),
    rt: z.string().describe('Route (e.g., "51B")'),
    tmstmp: z.string().describe('Timestamp "YYYYMMDD HH:MM"'),
    lat: z
        .union([z.string(), z.number()])
        .transform((v) => String(v))
        .describe('Latitude as a string'),
    lon: z
        .union([z.string(), z.number()])
        .transform((v) => String(v))
        .describe('Longitude as a string'),
    hdg: z.union([z.string(), z.number()]).optional().describe('Heading in degrees'),
    spd: z.union([z.string(), z.number()]).optional().describe('Speed in mph'),
    tatripid: z.string().optional().describe('Trip ID (string form)'),
    tripid: z.coerce.number().optional().describe('Trip identifier (numeric)'),
});

/**
 * ACT bus vehicle position objects
 */
export type BusPositionRaw = z.infer<typeof BusPositionRawSchema>;

export const VehiclePositionsResponseSchema = z
    .looseObject({
        'bustime-response': z
            .looseObject({
                vehicle: z.array(BusPositionRawSchema).optional().describe('Array of vehicle positions'),
            })
            .describe('AC Transit BusTime envelope (vehicle positions)'),
    })
    .describe('AC Transit vehicle positions API response');

/**
 * Response type for GET actrealtime/vehicle?vid={vid}&rt={rt}&tmres={tmres}&callback={callback}&lat={lat}&lng={lng}&searchRadius={searchRadius}
 */
export type VehiclePositionsResponse = z.infer<typeof VehiclePositionsResponseSchema>;
