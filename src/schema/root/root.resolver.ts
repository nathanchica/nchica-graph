import type { GraphQLContext } from '../../context.js';
import type { Resolvers } from '../../generated/graphql.js';

export const rootResolvers: Resolvers = {
    Query: {
        health: () => 'ok',
        serverVersion: (_parent: unknown, _args: unknown, _ctx: GraphQLContext) => '0.1.0',
    },
    Subscription: {
        heartbeat: {
            subscribe: async function* heartbeatGenerator() {
                while (true) {
                    yield { heartbeat: new Date() };
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            },
        },
    },
};
