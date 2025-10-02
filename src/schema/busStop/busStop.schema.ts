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
`;
