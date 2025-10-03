# Where is Bus 51B?

A real-time dashboard for tracking AC Transit Bus Line 51B using GraphQL subscriptions, providing live bus positions and
arrival predictions for specific stops.

## Tech Stack

- **GraphQL Yoga** - Lightweight GraphQL server with built-in subscription support
- **Node.js** - Runtime environment
- **gtfs-realtime-bindings** - For parsing AC Transit's protobuf data
- **node-fetch** - HTTP client for API calls
- **graphql-sse** - Server-Sent Events support for subscriptions (via Yoga plugin)
- **graphql-scalars** - Extended scalar types (DateTime, JSON)
- **ioredis** - Redis client with automatic fallback to memory cache
- **Zod** - Runtime validation for environment variables

### Data Source

1. **ACT RealTime API** (JSON)
    - Vehicle Positions: `https://api.actransit.org/transit/actrealtime/vehiclepositions`
    - Stop Predictions: `https://api.actransit.org/transit/actrealtime/prediction`
    - Service Alerts: `https://api.actransit.org/transit/actrealtime/servicebulletin`
    - System Time: `https://api.actransit.org/transit/actrealtime/time`
    - Stop Profiles: `https://api.actransit.org/transit/actrealtime/stop`

2. **GTFS-Realtime Feeds** (Binary Protobuf)
    - Vehicle Positions: `https://api.actransit.org/transit/gtfsrt/vehicles`
    - Trip Updates: `https://api.actransit.org/transit/gtfsrt/tripupdates`
    - Service Alerts: `https://api.actransit.org/transit/gtfsrt/alerts`

3. **GTFS Static** (ZIP file with CSVs)
    - Routes, stops, stop times, shapes
    - Updated ~3 times per year

## Architecture

```
┌─────────────────────────────┐
│       AC Transit APIs       │
│  actrealtime JSON | gtfsrt  │
└──────────────┬──────────────┘
               │ HTTP polling
      ┌────────▼─────────────┐
      │ GraphQL Yoga         │
      │ services:            │
      │  • actRealtime       │
      │  • gtfsRealtime      │
      │ formatters:          │
      │  • busPosition       │
      │  • busStop           │
      │  • busStopPrediction │
      │ cache: Redis / mem   │
      └────────┬─────────────┘
               │ GraphQL over HTTP/SSE
┌──────────────▼──────────────┐
│ React client                │
│ dashboard + map UI          │
└─────────────────────────────┘
```

The backend fetches from both ACT RealTime (JSON) and GTFS-Realtime (protobuf) feeds based on client requests,
normalizes the data through dedicated formatter utilities, and serves consistent GraphQL types.

Subscriptions stream over GraphQL Yoga using Server‑Sent Events.

### Implementation Notes

- **No Route Filtering**: AC Transit API returns all routes - filtering happens in backend
- **Timestamp Format**: Uses Long (64-bit integers) from protobuf, converted to Date objects
- **Direction**: `directionId` 0 = Outbound, 1 = Inbound
- **Multilingual Alerts**: Alerts include Spanish/Chinese translations separated by `---`

### Stop Identifier Confusion (Important!)

AC Transit uses two different identifier systems for bus stops, and the naming is confusing:

1. **stop_id** (GTFS Standard)
    - Sequential internal identifier (e.g., "1234", "5678")
    - Used in GTFS-Realtime feeds (protobuf)
    - Used in GTFS static data (stops.txt)
    - Primary key in the GTFS ecosystem

2. **stop_code** (Public-facing)
    - 5-digit code displayed on physical bus stop signs (e.g., "55555", "58883")
    - What passengers see and use to identify stops
    - Human-readable and consistent across systems
    - **CONFUSING**: AC Transit's proprietary REST API calls this field "StopId" or "stpid" even though it's actually the stop_code!

**Critical Integration Note**:

- GTFS-Realtime predictions use actual `stop_id` values
- AC Transit REST API predictions use `stop_code` values but confusingly label them as "StopId/stpid"
- The backend must map between these identifiers using GTFS static data (stops.txt) which contains both fields
- When the AC Transit API returns "StopId": "55555", this is actually the stop_code, not the GTFS stop_id

---

**Note**: This project is not affiliated with AC Transit. It uses publicly available GTFS data to provide real-time bus tracking information.
