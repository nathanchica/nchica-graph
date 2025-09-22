import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { GraphQLSchema } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';

import { rootResolvers, rootTypeDefs } from './root/index.js';

import type { GraphQLContext } from '../context.js';

const typeDefs = mergeTypeDefs([rootTypeDefs]);

const resolvers = mergeResolvers([
    // GraphQL scalar resolvers
    { DateTime: DateTimeResolver },
    // Domain-specific resolvers
    rootResolvers,
]);

export const schema: GraphQLSchema = makeExecutableSchema<GraphQLContext>({
    typeDefs,
    resolvers,
});
