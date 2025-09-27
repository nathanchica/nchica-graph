import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: ['src/schema/**/*.schema.ts'],
    documents: ['src/**/*.ts'],
    generates: {
        'src/generated/graphql.ts': {
            plugins: ['typescript', 'typescript-resolvers', 'typescript-operations'],
            config: {
                contextType: '../context.js#GraphQLContext',
                useTypeImports: true,
                scalars: {
                    DateTime: 'Date',
                },
                avoidOptionals: {
                    field: true,
                    object: true,
                },
                mappers: {
                    AcTransitBusStop: '../schema/busStop/busStop.resolver.js#AcTransitBusStopParent',
                    ACTransitSystem: '../schema/transitSystem/transitSystem.resolver.js#ACTransitSystemParent',
                },
            },
        },
    },
    hooks: {
        afterOneFileWrite: ['prettier --write'],
    },
};

export default config;
