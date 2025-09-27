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
        Latitude of the stop location
        """
        latitude: Float!

        """
        Longitude of the stop location
        """
        longitude: Float!
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
        Latitude of the stop location
        """
        latitude: Float!

        """
        Longitude of the stop location
        """
        longitude: Float!
    }
`;
