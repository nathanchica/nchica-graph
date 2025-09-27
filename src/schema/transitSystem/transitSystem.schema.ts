export const transitSystemDefs = /* GraphQL */ `
    """
    Represents a generic transit system
    """
    interface TransitSystem {
        """
        Short unique alias for the transit system (e.g., "act" for AC Transit)
        """
        alias: String!

        """
        Displayable name of the transit system
        """
        name: String!
    }

    """
    AC Transit system information and lookups
    """
    type ACTransitSystem implements TransitSystem {
        """
        Short unique alias for the transit system (e.g., "act" for AC Transit)
        """
        alias: String!

        """
        Displayable name of the transit system
        """
        name: String!

        """
        List of all bus stops in the AC Transit system
        """
        busStops: [AcTransitBusStop!]!

        """
        Look up a single bus stop by its public stop code (5-digit code on the sign). Null if not found.
        """
        busStop(
            """
            Public stop code to look up (e.g., "55555")
            """
            busStopCode: String!
        ): AcTransitBusStop
    }

    extend type Query {
        """
        Look up a transit system by its alias (e.g., "act" for AC Transit). Null if not found.
        """
        getTransitSystem(alias: String!): TransitSystem
    }

    extend type Subscription {
        """
        Subscribe to current system date and time of AC Transit system
        """
        acTransitSystemTime: DateTime!
    }
`;
