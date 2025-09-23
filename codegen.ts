import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
    schema: ['src/schema/**/*.schema.ts'],
    generates: {
        'src/generated/graphql.ts': {
            plugins: ['typescript', 'typescript-resolvers'],
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
            },
        },
    },
    hooks: {
        afterOneFileWrite: ['prettier --write'],
    },
};

export default config;
