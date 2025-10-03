export const busStopDefs = /* GraphQL */ `
    """
    Represents a bus stop in any transit system
    """
    interface BusStop {
        """
        GTFS stop identifier (sequential ID used in GTFS feeds, e.g., "1234")
        """
        id: String!

        """
        Human-readable stop name
        """
        name: String!

        """
        Geographic position of the stop
        """
        position: Position!
    }

    """
    Represents a bus stop in the AC Transit system
    """
    type AcTransitBusStop implements BusStop {
        """
        GTFS stop identifier (sequential ID used in GTFS feeds, e.g., "1234")
        """
        id: String!

        """
        Public stop code (5-digit code on physical bus stop signs, e.g., "55555")
        Note: AC Transit's API confusingly calls this "StopId" but it's the stop_code
        """
        code: String!

        """
        Human-readable stop name
        """
        name: String!

        """
        Geographic position of the stop
        """
        position: Position!
    }

    extend type ACTransitSystem {
        """
        Look up a single bus stop by its public stop code (5-digit code on the sign). Null if not found.
        """
        busStop(
            """
            Public stop code to look up (e.g., "55555")
            """
            busStopCode: String!
        ): AcTransitBusStop

        """
        List of all bus stops in the AC Transit system
        """
        busStops(
            """
            Route ID to filter bus stops that serve a specific route (e.g., "51B")
            """
            routeId: String!
        ): [AcTransitBusStop!]!
    }

    """
    Represents a predicted bus arrival at a stop
    """
    type BusStopPrediction {
        """
        Vehicle identifier for the approaching bus
        """
        vehicleId: String!

        """
        GTFS trip identifier
        """
        tripId: String!

        """
        Predicted arrival time
        """
        arrivalTime: DateTime!

        """
        Number of minutes until arrival
        """
        minutesAway: Int!

        """
        True if bus is heading outbound (away from downtown)
        """
        isOutbound: Boolean!
    }

    extend type Subscription {
        """
        Subscribe to real-time arrival predictions for a specific bus stop
        """
        busStopPredictions(
            """
            Route ID to filter by (e.g., "51B")
            """
            routeId: String!

            """
            Stop code to get predictions for (5-digit code from bus stop sign, e.g., "55555")
            """
            stopCode: String!

            """
            Direction to filter predictions (INBOUND towards Rockridge BART or OUTBOUND towards Berkeley Amtrak)
            """
            direction: BusDirection!
        ): [BusStopPrediction!]!
    }
`;
