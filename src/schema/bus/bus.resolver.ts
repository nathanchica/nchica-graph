import type { GraphQLContext } from '../../context.js';

export type BusParent = {
    __typename: 'Bus';
    placeholder: string;
};

export function createBusParent(data: Partial<BusParent> = {}): BusParent {
    return {
        __typename: 'Bus',
        placeholder: data.placeholder ?? 'TODO',
        ...data,
    };
}

export const busResolvers = {
    Bus: {
        placeholder: (parent: BusParent, _args: unknown, _ctx: GraphQLContext) => parent.placeholder ?? 'TODO',
    },
};
