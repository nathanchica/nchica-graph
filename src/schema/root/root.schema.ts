export const rootTypeDefs = /* GraphQL */ `
    """
    ISO 8601 DateTime scalar type
    """
    scalar DateTime

    """
    Represents a geographic position and direction (if movable)
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
    Root query type
    """
    type Query {
        """
        Health check endpoint
        """
        health: String!

        """
        Current server version
        """
        serverVersion: String!
    }

    """
    Root subscription type for real-time updates
    """
    type Subscription {
        """
        Heartbeat subscription that emits current timestamp every second
        """
        heartbeat: DateTime!
    }
`;
