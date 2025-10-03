import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { AcTransitBusStopParent } from '../schema/busStop/busStop.resolver.js';
import type { ACTransitSystemParent } from '../schema/transitSystem/transitSystem.resolver.js';
import type { BusParent } from '../schema/bus/bus.resolver.js';
import type { GraphQLContext } from '../context.js';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    /** ISO 8601 DateTime scalar type */
    DateTime: { input: Date; output: Date };
};

/** AC Transit system information and lookups */
export type AcTransitSystem = TransitSystem & {
    __typename?: 'ACTransitSystem';
    /** Short unique alias for the transit system (e.g., "act" for AC Transit) */
    alias: Scalars['String']['output'];
    /** Look up a single bus stop by its public stop code (5-digit code on the sign). Null if not found. */
    busStop: Maybe<AcTransitBusStop>;
    /** List of all bus stops in the AC Transit system */
    busStops: Array<AcTransitBusStop>;
    /** Displayable name of the transit system */
    name: Scalars['String']['output'];
};

/** AC Transit system information and lookups */
export type AcTransitSystemBusStopArgs = {
    busStopCode: Scalars['String']['input'];
};

/** AC Transit system information and lookups */
export type AcTransitSystemBusStopsArgs = {
    routeId: Scalars['String']['input'];
};

/** Represents a bus stop in the AC Transit system */
export type AcTransitBusStop = BusStop & {
    __typename?: 'AcTransitBusStop';
    /**
     * Public stop code (5-digit code on physical bus stop signs, e.g., "55555")
     * Note: AC Transit's API confusingly calls this "StopId" but it's the stop_code
     */
    code: Scalars['String']['output'];
    /** GTFS stop identifier (sequential ID used in GTFS feeds, e.g., "1234") */
    id: Scalars['String']['output'];
    /** Human-readable stop name */
    name: Scalars['String']['output'];
    /** Geographic position of the stop */
    position: Position;
};

/** Represents a bus in any transit system */
export type Bus = {
    __typename?: 'Bus';
    /** Current position and movement details */
    position: Position;
    /** GTFS vehicle identifier (unique ID used in GTFS feeds, e.g., "1234") */
    vehicleId: Scalars['String']['output'];
};

/** Enum for bus direction */
export enum BusDirection {
    /** Inbound (going towards downtown) */
    Inbound = 'INBOUND',
    /** Outbound (going away from downtown) */
    Outbound = 'OUTBOUND',
}

/** Represents a bus stop in any transit system */
export type BusStop = {
    /** GTFS stop identifier (sequential ID used in GTFS feeds, e.g., "1234") */
    id: Scalars['String']['output'];
    /** Human-readable stop name */
    name: Scalars['String']['output'];
    /** Geographic position of the stop */
    position: Position;
};

/** Represents a predicted bus arrival at a stop */
export type BusStopPrediction = {
    __typename?: 'BusStopPrediction';
    /** Predicted arrival time */
    arrivalTime: Scalars['DateTime']['output'];
    /** True if bus is heading outbound (away from downtown) */
    isOutbound: Scalars['Boolean']['output'];
    /** Number of minutes until arrival */
    minutesAway: Scalars['Int']['output'];
    /** GTFS trip identifier */
    tripId: Scalars['String']['output'];
    /** Vehicle identifier for the approaching bus */
    vehicleId: Scalars['String']['output'];
};

/** Represents a geographic position and direction (if movable) */
export type Position = {
    __typename?: 'Position';
    /** Compass heading in degrees (0-360). Null if not movable. */
    heading: Maybe<Scalars['Float']['output']>;
    /** Current latitude position */
    latitude: Scalars['Float']['output'];
    /** Current longitude position */
    longitude: Scalars['Float']['output'];
    /** Current speed in miles per hour. Null if not movable. */
    speed: Maybe<Scalars['Float']['output']>;
};

/** Root query type */
export type Query = {
    __typename?: 'Query';
    /** Look up a transit system by its alias (e.g., "act" for AC Transit). Null if not found. */
    getTransitSystem: Maybe<TransitSystem>;
    /** Health check endpoint */
    health: Scalars['String']['output'];
    /** Current server version */
    serverVersion: Scalars['String']['output'];
};

/** Root query type */
export type QueryGetTransitSystemArgs = {
    alias: Scalars['String']['input'];
};

/** Root subscription type for real-time updates */
export type Subscription = {
    __typename?: 'Subscription';
    /** Subscribe to current system date and time of AC Transit system */
    acTransitSystemTime: Scalars['DateTime']['output'];
    /** Subscribe to real-time arrival predictions for a specific bus stop */
    busStopPredictions: Array<BusStopPrediction>;
    /** List of all buses in the AC Transit system */
    busesByRoute: Array<Bus>;
    /** Heartbeat subscription that emits current timestamp every second */
    heartbeat: Scalars['DateTime']['output'];
};

/** Root subscription type for real-time updates */
export type SubscriptionBusStopPredictionsArgs = {
    direction: BusDirection;
    routeId: Scalars['String']['input'];
    stopCode: Scalars['String']['input'];
};

/** Root subscription type for real-time updates */
export type SubscriptionBusesByRouteArgs = {
    routeId: Scalars['String']['input'];
};

/** Represents a generic transit system */
export type TransitSystem = {
    /** Short unique alias for the transit system (e.g., "act" for AC Transit) */
    alias: Scalars['String']['output'];
    /** Displayable name of the transit system */
    name: Scalars['String']['output'];
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
    resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<
    TResult,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
    resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
    resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
    | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
    | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
    TResult,
    TKey extends string,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> =
    | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
    | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
    parent: TParent,
    context: TContext,
    info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
    obj: T,
    context: TContext,
    info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
    TResult = Record<PropertyKey, never>,
    TParent = Record<PropertyKey, never>,
    TContext = Record<PropertyKey, never>,
    TArgs = Record<PropertyKey, never>,
> = (
    next: NextResolverFn<TResult>,
    parent: TParent,
    args: TArgs,
    context: TContext,
    info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping of interface types */
export type ResolversInterfaceTypes<_RefType extends Record<string, unknown>> = {
    BusStop: AcTransitBusStopParent;
    TransitSystem: ACTransitSystemParent;
};

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
    ACTransitSystem: ResolverTypeWrapper<ACTransitSystemParent>;
    AcTransitBusStop: ResolverTypeWrapper<AcTransitBusStopParent>;
    Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
    Bus: ResolverTypeWrapper<BusParent>;
    BusDirection: BusDirection;
    BusStop: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['BusStop']>;
    BusStopPrediction: ResolverTypeWrapper<BusStopPrediction>;
    DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
    Float: ResolverTypeWrapper<Scalars['Float']['output']>;
    Int: ResolverTypeWrapper<Scalars['Int']['output']>;
    Position: ResolverTypeWrapper<Position>;
    Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
    String: ResolverTypeWrapper<Scalars['String']['output']>;
    Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
    TransitSystem: ResolverTypeWrapper<ResolversInterfaceTypes<ResolversTypes>['TransitSystem']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
    ACTransitSystem: ACTransitSystemParent;
    AcTransitBusStop: AcTransitBusStopParent;
    Boolean: Scalars['Boolean']['output'];
    Bus: BusParent;
    BusStop: ResolversInterfaceTypes<ResolversParentTypes>['BusStop'];
    BusStopPrediction: BusStopPrediction;
    DateTime: Scalars['DateTime']['output'];
    Float: Scalars['Float']['output'];
    Int: Scalars['Int']['output'];
    Position: Position;
    Query: Record<PropertyKey, never>;
    String: Scalars['String']['output'];
    Subscription: Record<PropertyKey, never>;
    TransitSystem: ResolversInterfaceTypes<ResolversParentTypes>['TransitSystem'];
};

export type AcTransitSystemResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['ACTransitSystem'] = ResolversParentTypes['ACTransitSystem'],
> = {
    alias?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    busStop?: Resolver<
        Maybe<ResolversTypes['AcTransitBusStop']>,
        ParentType,
        ContextType,
        RequireFields<AcTransitSystemBusStopArgs, 'busStopCode'>
    >;
    busStops?: Resolver<
        Array<ResolversTypes['AcTransitBusStop']>,
        ParentType,
        ContextType,
        RequireFields<AcTransitSystemBusStopsArgs, 'routeId'>
    >;
    name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type AcTransitBusStopResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['AcTransitBusStop'] = ResolversParentTypes['AcTransitBusStop'],
> = {
    code?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    position?: Resolver<ResolversTypes['Position'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type BusResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['Bus'] = ResolversParentTypes['Bus'],
> = {
    position?: Resolver<ResolversTypes['Position'], ParentType, ContextType>;
    vehicleId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type BusStopResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['BusStop'] = ResolversParentTypes['BusStop'],
> = {
    __resolveType: TypeResolveFn<'AcTransitBusStop', ParentType, ContextType>;
};

export type BusStopPredictionResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['BusStopPrediction'] = ResolversParentTypes['BusStopPrediction'],
> = {
    arrivalTime?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
    isOutbound?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
    minutesAway?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
    tripId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    vehicleId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
    name: 'DateTime';
}

export type PositionResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['Position'] = ResolversParentTypes['Position'],
> = {
    heading?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
    latitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
    longitude?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
    speed?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
};

export type QueryResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = {
    getTransitSystem?: Resolver<
        Maybe<ResolversTypes['TransitSystem']>,
        ParentType,
        ContextType,
        RequireFields<QueryGetTransitSystemArgs, 'alias'>
    >;
    health?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    serverVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type SubscriptionResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription'],
> = {
    acTransitSystemTime?: SubscriptionResolver<
        ResolversTypes['DateTime'],
        'acTransitSystemTime',
        ParentType,
        ContextType
    >;
    busStopPredictions?: SubscriptionResolver<
        Array<ResolversTypes['BusStopPrediction']>,
        'busStopPredictions',
        ParentType,
        ContextType,
        RequireFields<SubscriptionBusStopPredictionsArgs, 'direction' | 'routeId' | 'stopCode'>
    >;
    busesByRoute?: SubscriptionResolver<
        Array<ResolversTypes['Bus']>,
        'busesByRoute',
        ParentType,
        ContextType,
        RequireFields<SubscriptionBusesByRouteArgs, 'routeId'>
    >;
    heartbeat?: SubscriptionResolver<ResolversTypes['DateTime'], 'heartbeat', ParentType, ContextType>;
};

export type TransitSystemResolvers<
    ContextType = GraphQLContext,
    ParentType extends ResolversParentTypes['TransitSystem'] = ResolversParentTypes['TransitSystem'],
> = {
    __resolveType: TypeResolveFn<'ACTransitSystem', ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
    ACTransitSystem?: AcTransitSystemResolvers<ContextType>;
    AcTransitBusStop?: AcTransitBusStopResolvers<ContextType>;
    Bus?: BusResolvers<ContextType>;
    BusStop?: BusStopResolvers<ContextType>;
    BusStopPrediction?: BusStopPredictionResolvers<ContextType>;
    DateTime?: GraphQLScalarType;
    Position?: PositionResolvers<ContextType>;
    Query?: QueryResolvers<ContextType>;
    Subscription?: SubscriptionResolvers<ContextType>;
    TransitSystem?: TransitSystemResolvers<ContextType>;
};

export type BusesByRouteSubscriptionVariables = Exact<{
    routeId: Scalars['String']['input'];
}>;

export type BusesByRouteSubscription = {
    __typename?: 'Subscription';
    busesByRoute: Array<{
        __typename?: 'Bus';
        vehicleId: string;
        position: {
            __typename?: 'Position';
            latitude: number;
            longitude: number;
            heading: number | null;
            speed: number | null;
        };
    }>;
};

export type GetBusStopProfileQueryVariables = Exact<{
    busStopCode: Scalars['String']['input'];
}>;

export type GetBusStopProfileQuery = {
    __typename?: 'Query';
    getTransitSystem: {
        __typename?: 'ACTransitSystem';
        busStop: {
            __typename?: 'AcTransitBusStop';
            id: string;
            code: string;
            name: string;
            position: { __typename?: 'Position'; latitude: number; longitude: number };
        } | null;
    } | null;
};

export type GetBusStopProfileIdQueryVariables = Exact<{
    busStopCode: Scalars['String']['input'];
}>;

export type GetBusStopProfileIdQuery = {
    __typename?: 'Query';
    getTransitSystem: {
        __typename?: 'ACTransitSystem';
        busStop: { __typename?: 'AcTransitBusStop'; id: string } | null;
    } | null;
};

export type GetBusStopProfileNameQueryVariables = Exact<{
    busStopCode: Scalars['String']['input'];
}>;

export type GetBusStopProfileNameQuery = {
    __typename?: 'Query';
    getTransitSystem: {
        __typename?: 'ACTransitSystem';
        busStop: { __typename?: 'AcTransitBusStop'; name: string } | null;
    } | null;
};

export type GetBusStopProfileLatitudeQueryVariables = Exact<{
    busStopCode: Scalars['String']['input'];
}>;

export type GetBusStopProfileLatitudeQuery = {
    __typename?: 'Query';
    getTransitSystem: {
        __typename?: 'ACTransitSystem';
        busStop: { __typename?: 'AcTransitBusStop'; position: { __typename?: 'Position'; latitude: number } } | null;
    } | null;
};

export type GetBusStopProfileLongitudeQueryVariables = Exact<{
    busStopCode: Scalars['String']['input'];
}>;

export type GetBusStopProfileLongitudeQuery = {
    __typename?: 'Query';
    getTransitSystem: {
        __typename?: 'ACTransitSystem';
        busStop: { __typename?: 'AcTransitBusStop'; position: { __typename?: 'Position'; longitude: number } } | null;
    } | null;
};

export type BusStopPredictionsSubscriptionSubscriptionVariables = Exact<{
    routeId: Scalars['String']['input'];
    stopCode: Scalars['String']['input'];
    direction: BusDirection;
}>;

export type BusStopPredictionsSubscriptionSubscription = {
    __typename?: 'Subscription';
    busStopPredictions: Array<{
        __typename?: 'BusStopPrediction';
        vehicleId: string;
        tripId: string;
        arrivalTime: Date;
        minutesAway: number;
        isOutbound: boolean;
    }>;
};

export type BusStopPredictionsSubscriptionVariables = Exact<{
    routeId: Scalars['String']['input'];
    stopCode: Scalars['String']['input'];
    direction: BusDirection;
}>;

export type BusStopPredictionsSubscription = {
    __typename?: 'Subscription';
    busStopPredictions: Array<{ __typename?: 'BusStopPrediction'; vehicleId: string }>;
};

export type GetTransitSystemQueryQueryVariables = Exact<{
    alias: Scalars['String']['input'];
}>;

export type GetTransitSystemQueryQuery = {
    __typename?: 'Query';
    getTransitSystem: { __typename?: 'ACTransitSystem'; alias: string; name: string } | null;
};

export type ActSystemTimeSubscriptionVariables = Exact<{ [key: string]: never }>;

export type ActSystemTimeSubscription = { __typename?: 'Subscription'; acTransitSystemTime: Date };
