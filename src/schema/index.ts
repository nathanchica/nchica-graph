import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeResolvers, mergeTypeDefs } from '@graphql-tools/merge';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { GraphQLSchema } from 'graphql';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';

import { rootResolvers } from './root/root.resolver.js';

import type { GraphQLContext } from '../context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load all GraphQL schema files
const schemaDirs = [path.join(__dirname, '.'), path.join(__dirname, '../schema')].filter((dir) => existsSync(dir));

if (schemaDirs.length === 0) {
    throw new Error('No GraphQL schema directory found. Make sure SDL files are available.');
}

const schemaGlobs = schemaDirs.map((dir) => path.join(dir, '**/*.graphql'));
const typesArray = loadFilesSync(schemaGlobs);
const typeDefs = mergeTypeDefs(typesArray);

const resolvers = mergeResolvers([
    // GraphQL scalar resolvers
    { DateTime: DateTimeResolver, JSON: JSONResolver },
    // Domain-specific resolvers
    rootResolvers,
]);

export const schema: GraphQLSchema = makeExecutableSchema<GraphQLContext>({
    typeDefs,
    resolvers,
});
