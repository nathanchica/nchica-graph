import { parseActRealtimeTimestamp } from '../datetime.js';

describe('parseActRealtimeTimestamp', () => {
    it('parses a PDT timestamp to the correct UTC time', () => {
        const result = parseActRealtimeTimestamp('20240701 12:34');
        expect(result.toISOString()).toBe('2024-07-01T19:34:00.000Z');
    });

    it('parses a PST timestamp to the correct UTC time', () => {
        const result = parseActRealtimeTimestamp('20240115 08:15');
        expect(result.toISOString()).toBe('2024-01-15T16:15:00.000Z');
    });

    it('defaults minutes to 00 when omitted', () => {
        const result = parseActRealtimeTimestamp('20240701 09');
        expect(result.toISOString()).toBe('2024-07-01T16:00:00.000Z');
    });

    it.each<[string | undefined]>([
        [undefined],
        [''],
        ['20240101'],
        ['20240132 00:00'], // invalid day
        ['20240101 24:00'], // invalid hour
        ['20240101 12:60'], // invalid minute
        ['20240701 ab:00'], // non-numeric hour
    ])('falls back to current time and warns for invalid input: %p', (input) => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = parseActRealtimeTimestamp(input as unknown as string | undefined);

        expect(result.toISOString()).toBe('2025-01-01T00:00:00.000Z');
        expect(warnSpy).toHaveBeenCalledWith(`Invalid ACT RealTime timestamp: ${input}`);

        warnSpy.mockRestore();
        vi.useRealTimers();
    });

    it('handles DST start boundary (pre-DST PST)', () => {
        // Before DST starts (PST, UTC-8)
        const result = parseActRealtimeTimestamp('20240310 01:30');
        expect(result.toISOString()).toBe('2024-03-10T09:30:00.000Z');
    });

    it('handles DST start boundary (post-DST PDT)', () => {
        // After DST starts (PDT, UTC-7)
        const result = parseActRealtimeTimestamp('20240310 03:30');
        expect(result.toISOString()).toBe('2024-03-10T10:30:00.000Z');
    });

    it('handles DST end boundary (ambiguous 01:30 resolves to PDT)', () => {
        // Before fallback occurs at 2:00 local; choose PDT (-7)
        const result = parseActRealtimeTimestamp('20241103 01:30');
        expect(result.toISOString()).toBe('2024-11-03T08:30:00.000Z');
    });

    it('uses legacy abbreviation offsets when provided (PDT)', () => {
        const spy = vi
            .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
            .mockImplementation(() => [{ type: 'timeZoneName', value: 'PDT' }] as unknown as Intl.DateTimeFormatPart[]);

        const result = parseActRealtimeTimestamp('20240701 00:00');
        expect(result.toISOString()).toBe('2024-07-01T07:00:00.000Z');

        spy.mockRestore();
    });

    it('uses legacy abbreviation offsets when provided (PST)', () => {
        const spy = vi
            .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
            .mockImplementation(() => [{ type: 'timeZoneName', value: 'PST' }] as unknown as Intl.DateTimeFormatPart[]);

        const result = parseActRealtimeTimestamp('20240115 00:00');
        expect(result.toISOString()).toBe('2024-01-15T08:00:00.000Z');

        spy.mockRestore();
    });

    it('treats unsupported abbreviation as zero offset', () => {
        const spy = vi
            .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
            .mockImplementation(() => [{ type: 'timeZoneName', value: 'XXX' }] as unknown as Intl.DateTimeFormatPart[]);

        const result = parseActRealtimeTimestamp('20240701 12:34');
        expect(result.toISOString()).toBe('2024-07-01T12:34:00.000Z');

        spy.mockRestore();
    });

    it('treats missing timeZoneName as zero offset', () => {
        const spy = vi
            .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
            .mockImplementation(() => [{ type: 'year', value: '2024' }] as unknown as Intl.DateTimeFormatPart[]);

        const result = parseActRealtimeTimestamp('20240701 12:34');
        expect(result.toISOString()).toBe('2024-07-01T12:34:00.000Z');

        spy.mockRestore();
    });

    it('treats bare UTC name as zero offset via regex path', () => {
        const spy = vi
            .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
            .mockImplementation(() => [{ type: 'timeZoneName', value: 'UTC' }] as unknown as Intl.DateTimeFormatPart[]);

        const result = parseActRealtimeTimestamp('20240701 12:00');
        expect(result.toISOString()).toBe('2024-07-01T12:00:00.000Z');

        spy.mockRestore();
    });

    it('parses positive offset with minutes (UTC+05:30)', () => {
        const spy = vi
            .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
            .mockImplementation(
                () => [{ type: 'timeZoneName', value: 'UTC+05:30' }] as unknown as Intl.DateTimeFormatPart[]
            );

        const result = parseActRealtimeTimestamp('20240701 12:00');
        // localTimestamp is 12:00Z; subtracting +05:30 yields 06:30Z
        expect(result.toISOString()).toBe('2024-07-01T06:30:00.000Z');

        spy.mockRestore();
    });

    it('parses positive offset without minutes (UTC+05)', () => {
        const spy = vi
            .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
            .mockImplementation(
                () => [{ type: 'timeZoneName', value: 'UTC+05' }] as unknown as Intl.DateTimeFormatPart[]
            );

        const result = parseActRealtimeTimestamp('20240701 12:00');
        // localTimestamp is 12:00Z; subtracting +05:00 yields 07:00Z
        expect(result.toISOString()).toBe('2024-07-01T07:00:00.000Z');

        spy.mockRestore();
    });

    it('falls back to current time when Date.UTC returns NaN', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-02-01T00:00:00.000Z'));

        const utcSpy = vi.spyOn(Date, 'UTC').mockReturnValue(Number.NaN as unknown as number);
        const result = parseActRealtimeTimestamp('20240701 12:34');

        expect(result.toISOString()).toBe('2025-02-01T00:00:00.000Z');

        utcSpy.mockRestore();
        vi.useRealTimers();
    });

    it('falls back at final NaN check when getTime is NaN', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-03-01T00:00:00.000Z'));

        const getTimeSpy = vi.spyOn(Date.prototype, 'getTime').mockReturnValue(Number.NaN);
        const result = parseActRealtimeTimestamp('20240701 12:34');

        expect(result.toISOString()).toBe('2025-03-01T00:00:00.000Z');

        getTimeSpy.mockRestore();
        vi.useRealTimers();
    });
});
