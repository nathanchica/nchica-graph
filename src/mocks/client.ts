import { TextDecoder } from 'node:util';

import { getOperationAST, parse } from 'graphql';
import { createYoga, maskError as defaultMaskError } from 'graphql-yoga';

import { createMockContext } from './context.js';

import type { GraphQLContext } from '../context.js';
import { schema } from '../schema/index.js';
import { isGraphQLError } from '../utils/error.js';

export interface TestRequestOptions {
    subscription?: {
        take?: number;
    };
}

export type GraphQLExecutionResult<TData = unknown> = {
    data?: TData;
    errors?: unknown;
};

export type GraphQLSubscriptionResults<TData = unknown> = GraphQLExecutionResult<TData>[];

type GraphQLSSEEnvelope<TData = unknown> = {
    id?: string;
    type?: string;
    payload?: GraphQLExecutionResult<TData> | null;
};

export interface TestGraphQLClient {
    request: (
        operation: string,
        variables?: Record<string, unknown>,
        contextOverrides?: Partial<GraphQLContext>,
        options?: TestRequestOptions
    ) => Promise<GraphQLExecutionResult | GraphQLSubscriptionResults>;
}

export const createTestClient = (): TestGraphQLClient => {
    const parseOperationType = (operation: string): 'query' | 'mutation' | 'subscription' => {
        try {
            const document = parse(operation);
            const operationAST = getOperationAST(document, undefined);
            return operationAST?.operation ?? 'query';
        } catch {
            return 'query';
        }
    };

    const readSSEPayloads = async <TData>(
        response: Response,
        take: number
    ): Promise<GraphQLSubscriptionResults<TData>> => {
        const body = response.body;
        if (!body) {
            throw new Error('SSE response missing body');
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const events: GraphQLSubscriptionResults<TData> = [];

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                let eventBoundary = buffer.indexOf('\n\n');
                while (eventBoundary !== -1) {
                    const rawEvent = buffer.slice(0, eventBoundary);
                    buffer = buffer.slice(eventBoundary + 2);
                    eventBoundary = buffer.indexOf('\n\n');

                    const payloads = rawEvent.split('\n').reduce<string[]>((acc, line) => {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data:')) {
                            return acc;
                        }

                        const value = trimmed.slice('data:'.length).trim();
                        if (value.length > 0) {
                            acc.push(value);
                        }

                        return acc;
                    }, []);

                    const reachedLimit = payloads.some((payloadJson) => {
                        const parsed = JSON.parse(payloadJson) as
                            | GraphQLSSEEnvelope<TData>
                            | GraphQLExecutionResult<TData>;

                        if ('payload' in parsed) {
                            const payload = parsed.payload;
                            if (!payload) {
                                return false;
                            }

                            events.push({
                                data: payload.data,
                                errors: payload.errors,
                            });
                        } else if ('data' in parsed || 'errors' in parsed) {
                            events.push({
                                data: parsed.data,
                                errors: parsed.errors,
                            });
                        } else {
                            return false;
                        }

                        return events.length >= take;
                    });

                    if (reachedLimit) {
                        return events;
                    }
                }
            }
        } finally {
            reader.cancel().catch(() => {
                // ignore cancellation errors
            });
        }

        if (events.length === 0) {
            throw new Error('SSE stream completed before yielding a payload');
        }

        return events;
    };

    const request = async (
        operation: string,
        variables?: Record<string, unknown>,
        contextOverrides?: Partial<GraphQLContext>,
        options?: TestRequestOptions
    ) => {
        const operationType = parseOperationType(operation);
        const yoga = createYoga({
            schema,
            context: () => createMockContext(contextOverrides),
            maskedErrors: {
                maskError(error, message, isDev) {
                    // Use our utility function to check for GraphQLError
                    // This handles module boundary issues in tests
                    if (isGraphQLError(error)) {
                        return error;
                    }

                    // Mask all other errors, mimicking production behavior
                    return defaultMaskError(error, message, isDev);
                },
            },
        });

        const response = await yoga.fetch('http://localhost:4000/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(operationType === 'subscription' ? { Accept: 'text/event-stream' } : {}),
            },
            body: JSON.stringify({
                query: operation,
                variables: variables ?? undefined,
            }),
        });

        if (operationType === 'subscription') {
            const take = Math.max(1, options?.subscription?.take ?? 1);
            const events = await readSSEPayloads(response, take);
            return take === 1 ? events[0] : events;
        }

        return response.json();
    };

    return {
        request,
    };
};
