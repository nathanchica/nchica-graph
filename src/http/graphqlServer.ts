import type { Server as HttpServer } from 'node:http';

import { GraphQLError, execute as graphqlExecute, subscribe as graphqlSubscribe, type ExecutionArgs } from 'graphql';
import { useServer } from 'graphql-ws/use/ws';
import { createYoga, type YogaServerInstance } from 'graphql-yoga';
import { WebSocketServer } from 'ws';

import { createContextFactory, type GraphQLContext } from '../context.js';
import { env } from '../env.js';
import { schema } from '../schema/index.js';
import { createACTRealtimeService } from '../services/actRealtime.js';
import { createGTFSRealtimeService } from '../services/gtfsRealtime.js';
import { getCachedOrFetch } from '../utils/cache.js';
import { fetchWithUrlParams } from '../utils/fetch.js';

const YOGA_EXECUTE_SYMBOL = Symbol('yoga.execute');
const YOGA_SUBSCRIBE_SYMBOL = Symbol('yoga.subscribe');

type YogaRootValue = {
    [YOGA_EXECUTE_SYMBOL]: typeof graphqlExecute;
    [YOGA_SUBSCRIBE_SYMBOL]: typeof graphqlSubscribe;
};

export interface CreateGraphQLServerOptions {
    graphqlEndpoint?: string;
    maskedErrors?: boolean;
    graphiql?: boolean;
}

export interface RegisteredWsServer {
    wsServer: WebSocketServer;
    dispose: () => Promise<void>;
}

export interface GraphQLServer {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    yoga: YogaServerInstance<GraphQLContext, {}>;
    graphqlEndpoint: string;
    registerWs: (httpServer: HttpServer) => RegisteredWsServer;
}

export function createGraphQLServer(options?: CreateGraphQLServerOptions): GraphQLServer {
    const graphqlEndpoint = options?.graphqlEndpoint ?? '/graphql';
    const maskedErrors = options?.maskedErrors ?? env.NODE_ENV === 'production';
    const graphiql = options?.graphiql ?? env.NODE_ENV !== 'production';

    const services = {
        actRealtime: createACTRealtimeService({
            fetchWithUrlParams,
            apiToken: env.AC_TRANSIT_TOKEN,
            apiBaseUrl: env.ACT_REALTIME_API_BASE_URL,
            cacheTtl: {
                busStopProfiles: env.WHERE_IS_51B_CACHE_TTL_BUS_STOP_PROFILES,
                predictions: env.WHERE_IS_51B_CACHE_TTL_PREDICTIONS,
                vehiclePositions: env.WHERE_IS_51B_CACHE_TTL_VEHICLE_POSITIONS,
            },
            getCachedOrFetch,
        }),
        gtfsRealtime: createGTFSRealtimeService({
            fetchWithUrlParams,
            apiToken: env.AC_TRANSIT_TOKEN,
            apiBaseUrl: env.GTFS_REALTIME_API_BASE_URL,
            cacheTtl: {
                vehiclePositions: env.WHERE_IS_51B_CACHE_TTL_VEHICLE_POSITIONS,
                tripUpdates: env.WHERE_IS_51B_CACHE_TTL_PREDICTIONS,
                serviceAlerts: env.WHERE_IS_51B_CACHE_TTL_SERVICE_ALERTS,
            },
            getCachedOrFetch,
        }),
    } as const;

    const yoga = createYoga<GraphQLContext>({
        schema,
        context: createContextFactory(services),
        maskedErrors,
        graphiql,
        graphqlEndpoint,
    });

    function registerWs(httpServer: HttpServer): RegisteredWsServer {
        const wsServer = new WebSocketServer({
            server: httpServer,
            path: yoga.graphqlEndpoint,
        });

        const wsServerCleanup = useServer(
            {
                execute: async (args) => {
                    const rootValue = args.rootValue as Partial<YogaRootValue> | undefined;
                    const yogaExecute = rootValue?.[YOGA_EXECUTE_SYMBOL];
                    return yogaExecute ? yogaExecute(args) : graphqlExecute(args);
                },
                subscribe: async (args) => {
                    const rootValue = args.rootValue as Partial<YogaRootValue> | undefined;
                    const yogaSubscribe = rootValue?.[YOGA_SUBSCRIBE_SYMBOL];
                    return yogaSubscribe ? yogaSubscribe(args) : graphqlSubscribe(args);
                },
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
                    const rootValue: YogaRootValue = {
                        [YOGA_EXECUTE_SYMBOL]: execute,
                        [YOGA_SUBSCRIBE_SYMBOL]: subscribe,
                    };

                    const executionArgs: ExecutionArgs = {
                        schema,
                        operationName: payload.operationName,
                        document,
                        variableValues: payload.variables,
                        contextValue: await contextFactory(),
                        rootValue,
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

        const dispose = async () => {
            await wsServerCleanup.dispose();
            wsServer.clients.forEach((socket) => socket.close(1001, 'Server shutting down'));
            wsServer.close();
        };

        return { wsServer, dispose };
    }

    return { yoga, graphqlEndpoint: yoga.graphqlEndpoint, registerWs };
}
