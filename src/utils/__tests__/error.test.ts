import { GraphQLError } from 'graphql';

import { isGraphQLError } from '../error.js';

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
