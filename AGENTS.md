## Editing & review policy

- Prefer direct file edits in the working tree.
- Present changes as a unified diff for my approval before applying.
- Do **not** propose bash/Python scripts (sed/awk/find/regex runners) to edit files unless I explicitly ask for a script or the task is to create tooling.
- When creating new files or large refactors, open a short plan first, then apply edits and show the diff.
- If an edit touches many files, group diffs by directory and summarize the intent per group.

## GraphQL Schema Conventions

### Documentation

- **Every type and field MUST be documented** using GraphQL docstrings
    ```graphql
    """
    Represents a user in the chat application
    """
    type User {
        """
        Unique identifier for the user
        """
        id: ID!
    }
    ```

### Pagination

- **Use cursor-based pagination** with `limit` and `after` parameters
    ```graphql
    type Query {
        messages(
            channelId: String!
            """
            Maximum number of items to return (default: 50)
            """
            limit: Int = 50
            """
            Cursor for pagination - fetch items after this ID
            """
            after: ID
        ): [Message!]!
    }
    ```

### Mutations

- **Every mutation MUST use Input and Payload patterns**

    ```graphql
    # Input type - even for single fields
    input DeleteUserInput {
        id: String!
    }

    # Payload type - even for single return values
    type DeleteUserPayload {
        success: Boolean!
    }

    type Mutation {
        deleteUser(input: DeleteUserInput!): DeleteUserPayload!
    }
    ```

### Type Design

- **Return full types, not IDs** in GraphQL types

    ```graphql
    # ✅ GOOD - Return full related objects
    type Message {
        author: User! # Full User object
        channel: Channel! # Full Channel object
    }

    # ❌ BAD - Don't expose foreign keys
    type Message {
        authorId: String! # Avoid this
        channelId: String! # Avoid this
    }
    ```

### File Organization

- **Each type gets its own directory** under `src/schema/`
    ```
    src/schema/
    ├── user/
    │   ├── user.graphql      # Schema definition
    │   └── user.resolver.ts   # Resolver implementation
    ├── message/
    │   ├── message.graphql
    │   └── message.resolver.ts
    ```

### Subscriptions

- **Use simple parameters** (not Input types) for subscriptions

    ```graphql
    type Subscription {
        # Simple scalar parameters for filtering
        messageAdded(channelId: String!): Message!

        # Return the actual type or custom event types
        userTyping(channelId: String!): TypingEvent!
    }
    ```

### Naming Conventions

- **Types**: PascalCase (e.g., `User`, `ServerMember`)
- **Fields**: camelCase (e.g., `displayName`, `createdAt`)
- **Input types**: Suffix with `Input` (e.g., `CreateUserInput`)
- **Payload types**: Suffix with `Payload` (e.g., `CreateUserPayload`)
- **Enums**: SCREAMING_SNAKE_CASE for values
