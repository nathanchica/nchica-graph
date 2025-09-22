import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { GraphQLError, type ExecutionArgs } from 'graphql';
import { useServer } from 'graphql-ws/use/ws';
import { createYoga } from 'graphql-yoga';
import { WebSocketServer } from 'ws';

import { createContext, type GraphQLContext } from './context.js';
import { env } from './env.js';
import { schema } from './schema/index.js';

const yoga = createYoga<GraphQLContext>({
    schema,
    context: createContext,
    maskedErrors: env.NODE_ENV === 'production',
    graphiql: env.NODE_ENV !== 'production',
});

const httpServer = createServer(yoga);

const wsServer = new WebSocketServer({
    server: httpServer,
    path: yoga.graphqlEndpoint,
});

const wsServerCleanup = useServer(
    {
        onSubscribe: async (ctx, _id, payload) => {
            const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
                ...ctx,
                req: ctx.extra.request,
                socket: ctx.extra.socket,
                params: payload,
            });

            if (!payload.query) {
                return [new GraphQLError('Missing subscription query')];
            }

            const document = typeof payload.query === 'string' ? parse(payload.query) : payload.query;

            const executionArgs: ExecutionArgs = {
                schema,
                operationName: payload.operationName,
                document,
                variableValues: payload.variables,
                contextValue: await contextFactory(),
                rootValue: {
                    execute,
                    subscribe,
                },
            };

            const errors = validate(schema, executionArgs.document);
            if (errors.length > 0) {
                return errors;
            }

            return executionArgs;
        },
    },
    wsServer
);

const shutdown = async () => {
    await wsServerCleanup.dispose();
    wsServer.clients.forEach((socket) => socket.close(1001, 'Server shutting down'));
    wsServer.close();
    httpServer.close();
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        void shutdown();
    });
}

httpServer.listen(env.PORT, env.HOST, () => {
    const address = httpServer.address() as AddressInfo | null;

    if (address) {
        const host = address.address === '::' ? 'localhost' : address.address;
        console.log(`GraphQL Yoga listening on http://${host}:${address.port}${yoga.graphqlEndpoint}`);
    } else {
        console.log('GraphQL Yoga server is listening.');
    }
});
