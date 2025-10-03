import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { IResolvers } from '@graphql-tools/utils';
import type { GraphQLSchema } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';

import { busDefs, busResolvers } from './bus/index.js';
import { busStopDefs, busStopResolvers } from './busStop/index.js';
import { rootResolvers, rootTypeDefs } from './root/index.js';
import { transitSystemDefs, transitSystemResolvers } from './transitSystem/index.js';

import type { GraphQLContext } from '../context.js';

const typeDefs = mergeTypeDefs([rootTypeDefs, busDefs, busStopDefs, transitSystemDefs]);

const resolvers = mergeResolvers([
    // GraphQL scalar resolvers
    { DateTime: DateTimeResolver },
    // Domain-specific resolvers
    busResolvers,
    busStopResolvers,
    transitSystemResolvers,
    rootResolvers,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
]) as unknown as IResolvers<any, GraphQLContext>;

export const schema: GraphQLSchema = makeExecutableSchema<GraphQLContext>({
    typeDefs,
    resolvers,
});
