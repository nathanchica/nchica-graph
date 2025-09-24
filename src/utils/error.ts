import { GraphQLError } from 'graphql';

/**
 * Checks if an error is a GraphQLError.
 *
 * This function uses duck-typing instead of instanceof to work around
 * module boundary issues that can occur in test environments where
 * GraphQLError instances from different module contexts fail instanceof checks.
 *
 * @param error - The error to check
 * @returns true if the error is a GraphQLError (or looks like one)
 */
export function isGraphQLError(error: unknown): error is GraphQLError {
    // First try instanceof
    if (error instanceof GraphQLError) {
        return true;
    }

    // Fallback to duck-typing
    // Check if it has the shape of a GraphQLError
    // Must have GraphQLError name AND extensions with a code property
    // Usage of `any` due to the unknown type of error
    return (
        error !== null &&
        typeof error === 'object' &&
        'name' in error &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).name === 'GraphQLError' &&
        'message' in error &&
        'extensions' in error &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (error as any).extensions === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (error as any).extensions !== null &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'code' in (error as any).extensions
    );
}

/**
 * Common metadata describing errors from upstream services.
 */
export type UpstreamMeta = {
    source?: string; // e.g., 'GTFS_RT' | 'ACT_REALTIME'
    url?: string;
};

/**
 * Error thrown for non-OK HTTP responses from upstream services.
 */
export class UpstreamHttpError extends Error {
    readonly status: number;
    readonly meta?: UpstreamMeta;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly cause?: any;

    constructor(message: string, args: { status: number; meta?: UpstreamMeta; cause?: unknown }) {
        super(message);
        this.name = 'UpstreamHttpError';
        this.status = args.status;
        this.meta = args.meta;
        // Preserve cause if provided (Node supports Error.cause, but we keep a field for portability)
        this.cause = args.cause;
    }
}

/**
 * Error thrown when an upstream request times out.
 */
export class UpstreamTimeoutError extends Error {
    readonly timeoutMs: number;
    readonly meta?: UpstreamMeta;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly cause?: any;

    constructor(message: string, args: { timeoutMs: number; meta?: UpstreamMeta; cause?: unknown }) {
        super(message);
        this.name = 'UpstreamTimeoutError';
        this.timeoutMs = args.timeoutMs;
        this.meta = args.meta;
        this.cause = args.cause;
    }
}

/**
 * Error thrown when upstream data cannot be parsed or decoded.
 */
export class UpstreamParseError extends Error {
    readonly meta?: UpstreamMeta;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly cause?: any;

    constructor(message: string, args: { meta?: UpstreamMeta; cause?: unknown }) {
        super(message);
        this.name = 'UpstreamParseError';
        this.meta = args.meta;
        this.cause = args.cause;
    }
}

/**
 * Error thrown for invalid inputs or domain validation failures.
 */
export class DataValidationError extends Error {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly details?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly cause?: any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(message: string, args?: { details?: any; cause?: unknown }) {
        super(message);
        this.name = 'DataValidationError';
        this.details = args?.details;
        this.cause = args?.cause;
    }
}

/**
 * Maps a status code to a GraphQL error code string.
 * Uses common GraphQL code conventions similar to Apollo/Yoga ecosystems.
 */
export function httpStatusToGraphQLErrorCode(status: number): string {
    if (status === 400 || status === 422) return 'BAD_REQUEST';
    if (status === 401) return 'UNAUTHENTICATED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 408) return 'SERVICE_UNAVAILABLE';
    if (status === 429) return 'TOO_MANY_REQUESTS';
    if (status >= 500 && status <= 599) return 'SERVICE_UNAVAILABLE';
    return 'INTERNAL_SERVER_ERROR';
}

/**
 * Convert unknown errors to a GraphQLError with consistent extensions.
 * - Returns GraphQLError unchanged when already a GraphQLError
 * - Maps typed errors to appropriate `extensions.code`
 * - Falls back to INTERNAL_SERVER_ERROR
 */
export function toGraphQLError(
    error: unknown,
    options?: {
        defaultMessage?: string;
        fallbackCode?: string;
        // Optional extra extensions to include
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extensions?: Record<string, any>;
    }
): GraphQLError {
    if (isGraphQLError(error)) {
        return error;
    }

    const defaultMessage = options?.defaultMessage ?? 'Internal server error';
    const fallbackCode = options?.fallbackCode ?? 'INTERNAL_SERVER_ERROR';

    if (error instanceof UpstreamHttpError) {
        const code = httpStatusToGraphQLErrorCode(error.status);
        return new GraphQLError(defaultMessage, {
            extensions: {
                code,
                status: error.status,
                ...(error.meta?.source ? { source: error.meta.source } : {}),
                ...(error.meta?.url ? { url: error.meta.url } : {}),
                ...(options?.extensions ?? {}),
            },
        });
    }

    if (error instanceof UpstreamTimeoutError) {
        return new GraphQLError(defaultMessage, {
            extensions: {
                code: 'SERVICE_UNAVAILABLE',
                reason: 'TIMEOUT',
                timeoutMs: error.timeoutMs,
                ...(error.meta?.source ? { source: error.meta.source } : {}),
                ...(error.meta?.url ? { url: error.meta.url } : {}),
                ...(options?.extensions ?? {}),
            },
        });
    }

    if (error instanceof UpstreamParseError) {
        return new GraphQLError(defaultMessage, {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                reason: 'PARSE_ERROR',
                ...(error.meta?.source ? { source: error.meta.source } : {}),
                ...(error.meta?.url ? { url: error.meta.url } : {}),
                ...(options?.extensions ?? {}),
            },
        });
    }

    if (error instanceof DataValidationError) {
        return new GraphQLError(defaultMessage, {
            extensions: {
                code: 'BAD_REQUEST',
                ...(error.details ? { details: error.details } : {}),
                ...(options?.extensions ?? {}),
            },
        });
    }

    // Unknown error: wrap into a generic GraphQLError
    return new GraphQLError(defaultMessage, {
        extensions: {
            code: fallbackCode,
            ...(options?.extensions ?? {}),
        },
    });
}
