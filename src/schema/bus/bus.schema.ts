export const busDefs = /* GraphQL */ `
    """
    Enum for bus direction
    """
    enum BusDirection {
        """
        Inbound (going towards downtown)
        """
        INBOUND

        """
        Outbound (going away from downtown)
        """
        OUTBOUND
    }

    """
    Represents a bus in any transit system
    """
    type Bus {
        """
        GTFS vehicle identifier (unique ID used in GTFS feeds, e.g., "1234")
        """
        vehicleId: String!

        """
        Current position and movement details
        """
        position: Position!
    }

    extend type Subscription {
        """
        List of all buses in the AC Transit system
        """
        busesByRoute(
            """
            Route ID to filter buses that are currently serving a specific route (e.g., "51B")
            """
            routeId: String!
        ): [Bus!]!
    }
`;
