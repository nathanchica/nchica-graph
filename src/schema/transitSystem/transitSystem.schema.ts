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
