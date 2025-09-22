import type { GraphQLContext } from '../../context.js';

export const rootResolvers = {
    Query: {
        health: () => 'ok',
        serverVersion: (_parent: unknown, _args: unknown, _ctx: GraphQLContext) => '0.1.0',
    },
    Subscription: {
        heartbeat: {
            subscribe: async function* heartbeatGenerator() {
                while (true) {
                    yield { heartbeat: new Date().toISOString() };
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            },
        },
    },
};
