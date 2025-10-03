import { getOperationAST } from 'graphql';
import { createYoga, maskError as defaultMaskError } from 'graphql-yoga';

import { createMockContext } from './context.js';

import type { GraphQLContext } from '../context.js';
import { schema } from '../schema/index.js';
import { isGraphQLError } from '../utils/error.js';

export interface SubscriptionCollectOptions {
    take?: number;
}

export type GraphQLExecutionResult<TData = unknown> = {
    data?: TData;
    errors?: unknown[];
    extensions?: unknown;
    hasNext?: boolean;
    incremental?: unknown;
};

export type GraphQLSubscriptionResults<TData = unknown> = GraphQLExecutionResult<TData>[];

const isAsyncIterable = <TValue>(value: unknown): value is AsyncIterable<TValue> => {
    return typeof (value as AsyncIterable<TValue>)?.[Symbol.asyncIterator] === 'function';
};

export interface TestGraphQLClient {
    request: <TData = unknown>(
        operation: string,
        variables?: Record<string, unknown>,
        contextOverrides?: Partial<GraphQLContext>
    ) => Promise<GraphQLExecutionResult<TData>>;
    collectSubscription: <TData = unknown>(
        operation: string,
        variables?: Record<string, unknown>,
        contextOverrides?: Partial<GraphQLContext>,
        options?: SubscriptionCollectOptions
    ) => Promise<GraphQLSubscriptionResults<TData>>;
}

export const createTestClient = (): TestGraphQLClient => {
    let pendingContextOverrides: Partial<GraphQLContext> | undefined;

    const yoga = createYoga<GraphQLContext>({
        schema,
        context: () => createMockContext(pendingContextOverrides),
        maskedErrors: {
            maskError(error, message, isDev) {
                if (isGraphQLError(error)) {
                    return error;
                }

                return defaultMaskError(error, message, isDev);
            },
        },
    });

    const createEnvelopedExecution = () => {
        const request = new Request('http://localhost:4000/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return yoga.getEnveloped({
            request,
        });
    };

    // Mirror HTTP serialization so scalars (e.g., Date) arrive as JSON-safe primitives.
    const normalizeResult = <TData>(result: GraphQLExecutionResult<TData>) => {
        return JSON.parse(JSON.stringify(result)) as GraphQLExecutionResult<TData>;
    };

    const prepareOperation = async (operation: string, contextOverrides?: Partial<GraphQLContext>) => {
        const enveloped = createEnvelopedExecution();
        const { schema, execute, subscribe, parse: parseDocument, contextFactory } = enveloped;

        try {
            pendingContextOverrides = contextOverrides;
            const document = parseDocument(operation);
            const operationAST = getOperationAST(document, undefined);
            const operationType = operationAST?.operation ?? 'query';
            const baseContext = await contextFactory();
            const contextValue = {
                ...baseContext,
                ...contextOverrides,
            } as GraphQLContext;

            return {
                schema,
                execute,
                subscribe,
                document,
                contextValue,
                operationType,
            };
        } finally {
            pendingContextOverrides = undefined;
        }
    };

    const request = async <TData = unknown>(
        operation: string,
        variables?: Record<string, unknown>,
        contextOverrides?: Partial<GraphQLContext>
    ): Promise<GraphQLExecutionResult<TData>> => {
        let prepared;
        try {
            prepared = await prepareOperation(operation, contextOverrides);
        } catch (error) {
            if (isGraphQLError(error)) {
                return normalizeResult({ errors: [error] } as GraphQLExecutionResult<TData>);
            }
            throw error;
        }
        const { schema, execute, subscribe, document, contextValue, operationType } = prepared;

        const variableValues = variables ?? undefined;

        if (operationType === 'subscription') {
            let result: unknown;
            try {
                result = await subscribe({
                    schema,
                    document,
                    variableValues,
                    contextValue,
                });
            } catch (error) {
                if (isGraphQLError(error)) {
                    return normalizeResult({ errors: [error] } as GraphQLExecutionResult<TData>);
                }
                throw error;
            }

            if (!isAsyncIterable<GraphQLExecutionResult<TData>>(result)) {
                return normalizeResult(result as GraphQLExecutionResult<TData>);
            }

            const iterator = result[Symbol.asyncIterator]();

            try {
                const { value, done } = await iterator.next();
                if (done || !value) {
                    return normalizeResult({
                        data: undefined,
                        errors: [new Error('Subscription completed before yielding a payload')],
                    } as GraphQLExecutionResult<TData>);
                }

                return normalizeResult(value as GraphQLExecutionResult<TData>);
            } catch (error) {
                if (isGraphQLError(error)) {
                    return normalizeResult({ errors: [error] } as GraphQLExecutionResult<TData>);
                }
                throw error;
            } finally {
                await iterator.return?.();
            }
        }

        let executionResult;
        try {
            executionResult = await execute({
                schema,
                document,
                variableValues,
                contextValue,
            });
        } catch (error) {
            if (isGraphQLError(error)) {
                return normalizeResult({ errors: [error] } as GraphQLExecutionResult<TData>);
            }
            throw error;
        }

        return normalizeResult(executionResult as GraphQLExecutionResult<TData>);
    };

    const collectSubscription = async <TData = unknown>(
        operation: string,
        variables?: Record<string, unknown>,
        contextOverrides?: Partial<GraphQLContext>,
        options?: SubscriptionCollectOptions
    ): Promise<GraphQLSubscriptionResults<TData>> => {
        const { schema, subscribe, document, contextValue, operationType } = await prepareOperation(
            operation,
            contextOverrides
        );

        if (operationType !== 'subscription') {
            throw new Error('collectSubscription can only be used with subscription operations');
        }

        let result: unknown;
        try {
            result = await subscribe({
                schema,
                document,
                variableValues: variables ?? undefined,
                contextValue,
            });
        } catch (error) {
            if (isGraphQLError(error)) {
                return [normalizeResult({ errors: [error] } as GraphQLExecutionResult<TData>)];
            }
            throw error;
        }

        const events: GraphQLSubscriptionResults<TData> = [];

        if (!isAsyncIterable<GraphQLExecutionResult<TData>>(result)) {
            events.push(normalizeResult(result as GraphQLExecutionResult<TData>));
            return events;
        }

        const iterator = result[Symbol.asyncIterator]();
        const take = Math.max(1, options?.take ?? 1);

        try {
            while (events.length < take) {
                let next;
                try {
                    next = await iterator.next();
                } catch (error) {
                    if (isGraphQLError(error)) {
                        events.push(normalizeResult({ errors: [error] } as GraphQLExecutionResult<TData>));
                        break;
                    }
                    throw error;
                }
                const { value, done } = next;
                if (done) {
                    break;
                }

                if (value) {
                    events.push(normalizeResult(value as GraphQLExecutionResult<TData>));
                }
            }
        } finally {
            await iterator.return?.();
        }

        if (events.length === 0) {
            throw new Error('Subscription completed before yielding a payload');
        }

        return events;
    };

    return {
        request,
        collectSubscription,
    };
};
