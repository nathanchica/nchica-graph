import 'dotenv/config';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { env } from './env.js';
import { createGraphQLServer } from './http/graphqlServer.js';

const { yoga, registerWs } = createGraphQLServer({
    graphqlEndpoint: '/graphql',
    maskedErrors: env.NODE_ENV === 'production',
    graphiql: env.NODE_ENV !== 'production',
});

const httpServer = createServer(yoga);
const { dispose } = registerWs(httpServer);

const shutdown = async () => {
    await dispose();
    httpServer.close();
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
        await shutdown();
        process.exit(0);
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
