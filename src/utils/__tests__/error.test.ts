import { GraphQLError } from 'graphql';

import {
    DataValidationError,
    UpstreamHttpError,
    UpstreamParseError,
    UpstreamTimeoutError,
    httpStatusToGraphQLErrorCode,
    isGraphQLError,
    toGraphQLError,
} from '../error.js';

describe('isGraphQLError', () => {
    it('returns true for GraphQLError instances', () => {
        const error = new GraphQLError('Bad request', {
            extensions: { code: 'BAD_REQUEST' },
        });

        expect(isGraphQLError(error)).toBe(true);
    });

    it('returns true for objects that look like GraphQLError', () => {
        const errorLike = {
            name: 'GraphQLError',
            message: 'Something went wrong',
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };

        expect(isGraphQLError(errorLike)).toBe(true);
    });

    it('returns false when extensions is missing code', () => {
        const errorLike = {
            name: 'GraphQLError',
            message: 'Missing code',
            extensions: {},
        };

        expect(isGraphQLError(errorLike)).toBe(false);
    });

    it('returns false for generic errors', () => {
        expect(isGraphQLError(new Error('Generic error'))).toBe(false);
    });

    it('returns false for non-object inputs', () => {
        expect(isGraphQLError('oops')).toBe(false);
        expect(isGraphQLError(null)).toBe(false);
        expect(isGraphQLError(undefined)).toBe(false);
    });
});

describe('httpStatusToGraphQLErrorCode', () => {
    it.each([
        [400, 'BAD_REQUEST'],
        [401, 'UNAUTHENTICATED'],
        [403, 'FORBIDDEN'],
        [404, 'NOT_FOUND'],
        [408, 'SERVICE_UNAVAILABLE'],
        [429, 'TOO_MANY_REQUESTS'],
        [500, 'SERVICE_UNAVAILABLE'],
        [503, 'SERVICE_UNAVAILABLE'],
        [599, 'SERVICE_UNAVAILABLE'],
        [200, 'INTERNAL_SERVER_ERROR'],
    ])('maps %s -> %s', (status, expected) => {
        expect(httpStatusToGraphQLErrorCode(status)).toBe(expected);
    });
});

describe('toGraphQLError', () => {
    it('returns GraphQLError unchanged if one is passed', () => {
        const gqlErr = new GraphQLError('Bad request', { extensions: { code: 'BAD_REQUEST' } });
        const mapped = toGraphQLError(gqlErr);
        expect(mapped).toBe(gqlErr);
        expect(isGraphQLError(mapped)).toBe(true);
    });

    it('maps UpstreamHttpError 500 to SERVICE_UNAVAILABLE with metadata', () => {
        const err = new UpstreamHttpError('HTTP error! status: 500', {
            status: 500,
            meta: { source: 'GTFS_RT', url: 'https://example.com/vehicles' },
        });
        const mapped = toGraphQLError(err, { defaultMessage: 'Transit feed unavailable' });
        expect(isGraphQLError(mapped)).toBe(true);
        expect(mapped.extensions?.code).toBe('SERVICE_UNAVAILABLE');
        expect(mapped.extensions?.status).toBe(500);
        expect(mapped.extensions?.source).toBe('GTFS_RT');
        expect(mapped.extensions?.url).toBe('https://example.com/vehicles');
        expect(mapped.message).toBe('Transit feed unavailable');
    });

    it('maps UpstreamHttpError 404 to NOT_FOUND', () => {
        const err = new UpstreamHttpError('HTTP error! status: 404', {
            status: 404,
            meta: { source: 'ACT_REALTIME' },
        });
        const mapped = toGraphQLError(err, { defaultMessage: 'Resource not found' });
        expect(mapped.extensions?.code).toBe('NOT_FOUND');
        expect(mapped.message).toBe('Resource not found');
    });

    it('maps UpstreamTimeoutError to SERVICE_UNAVAILABLE with reason TIMEOUT', () => {
        const err = new UpstreamTimeoutError('Upstream timeout', {
            timeoutMs: 5000,
            meta: { source: 'GTFS_RT' },
        });
        const mapped = toGraphQLError(err, { defaultMessage: 'Upstream timeout' });
        expect(mapped.extensions?.code).toBe('SERVICE_UNAVAILABLE');
        expect(mapped.extensions?.reason).toBe('TIMEOUT');
        expect(mapped.extensions?.timeoutMs).toBe(5000);
        expect(mapped.extensions?.source).toBe('GTFS_RT');
    });

    it('maps UpstreamParseError to INTERNAL_SERVER_ERROR with reason PARSE_ERROR', () => {
        const err = new UpstreamParseError('Parse failed', { meta: { source: 'GTFS_RT' } });
        const mapped = toGraphQLError(err, { defaultMessage: 'Internal server error' });
        expect(mapped.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
        expect(mapped.extensions?.reason).toBe('PARSE_ERROR');
        expect(mapped.extensions?.source).toBe('GTFS_RT');
    });

    it('maps DataValidationError to BAD_REQUEST and includes details', () => {
        const err = new DataValidationError('Invalid input', { details: { field: 'stopId' } });
        const mapped = toGraphQLError(err, { defaultMessage: 'Bad request' });
        expect(mapped.extensions?.code).toBe('BAD_REQUEST');
        expect(mapped.extensions?.details).toEqual({ field: 'stopId' });
    });

    it('maps unknown errors to INTERNAL_SERVER_ERROR with default message', () => {
        const err = new Error('unknown');
        const mapped = toGraphQLError(err, { defaultMessage: 'Oops' });
        expect(mapped.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
        expect(mapped.message).toBe('Oops');
    });

    it('uses default message when options are omitted (UpstreamHttpError)', () => {
        const err = new UpstreamHttpError('HTTP error! status: 503', { status: 503 });
        const mapped = toGraphQLError(err);
        expect(mapped.message).toBe('Internal server error');
        expect(mapped.extensions?.code).toBe('SERVICE_UNAVAILABLE');
        // meta fields should be absent when not provided
        expect('source' in mapped.extensions).toBe(false);
        expect('url' in mapped.extensions).toBe(false);
    });

    it('includes meta.url for timeout errors', () => {
        const err = new UpstreamTimeoutError('Timeout', {
            timeoutMs: 10000,
            meta: { source: 'ACT_REALTIME', url: 'https://example.com/time' },
        });
        const mapped = toGraphQLError(err);
        expect(mapped.extensions?.code).toBe('SERVICE_UNAVAILABLE');
        expect(mapped.extensions?.reason).toBe('TIMEOUT');
        expect(mapped.extensions?.timeoutMs).toBe(10000);
        expect(mapped.extensions?.source).toBe('ACT_REALTIME');
        expect(mapped.extensions?.url).toBe('https://example.com/time');
    });

    it('omits source/url when timeout error has no meta', () => {
        const err = new UpstreamTimeoutError('Timeout', { timeoutMs: 15000 });
        const mapped = toGraphQLError(err);
        expect(mapped.extensions?.code).toBe('SERVICE_UNAVAILABLE');
        expect(mapped.extensions?.reason).toBe('TIMEOUT');
        expect(mapped.extensions?.timeoutMs).toBe(15000);
        expect('source' in mapped.extensions).toBe(false);
        expect('url' in mapped.extensions).toBe(false);
    });

    it('includes meta.url for parse errors', () => {
        const err = new UpstreamParseError('Parse failed', {
            meta: { source: 'GTFS_RT', url: 'https://example.com/feed' },
        });
        const mapped = toGraphQLError(err);
        expect(mapped.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
        expect(mapped.extensions?.reason).toBe('PARSE_ERROR');
        expect(mapped.extensions?.source).toBe('GTFS_RT');
        expect(mapped.extensions?.url).toBe('https://example.com/feed');
    });

    it('omits source/url when parse error has no meta', () => {
        const err = new UpstreamParseError('Parse failed', {});
        const mapped = toGraphQLError(err);
        expect(mapped.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
        expect(mapped.extensions?.reason).toBe('PARSE_ERROR');
        expect('source' in mapped.extensions).toBe(false);
        expect('url' in mapped.extensions).toBe(false);
    });

    it('omits details when DataValidationError has no details', () => {
        const err = new DataValidationError('Invalid input');
        const mapped = toGraphQLError(err);
        expect(mapped.extensions?.code).toBe('BAD_REQUEST');
        expect('details' in mapped.extensions).toBe(false);
    });
});
