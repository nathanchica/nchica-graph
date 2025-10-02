export const busDefs = /* GraphQL */ `
    """
    Represents a real-time position and direction (if movable)
    """
    type Position {
        """
        Current latitude position
        """
        latitude: Float!

        """
        Current longitude position
        """
        longitude: Float!

        """
        Compass heading in degrees (0-360). Null if not movable.
        """
        heading: Float

        """
        Current speed in miles per hour. Null if not movable.
        """
        speed: Float
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

    extend type ACTransitSystem {
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
