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
