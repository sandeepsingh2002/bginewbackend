# Shipment Transport System

This document explains the new shipment tracking system built around `TransportSession`.

## Overview

The shipment system is designed as a simple transport-session based flow for hackathon use.

Instead of managing multiple logistics entities for each movement, one `TransportSession` represents one shipment journey from pickup to drop.

Typical routes:

- Producer -> Processor
- Processor -> Warehouse
- Warehouse -> Retailer

Each transport session is linked to a product using `masterProductId`, so shipment data becomes part of the traceability timeline.

## Core Models

### 1. TransportSession

Defined in [TransportSession.js](c:/javaFiles/bgihackathon/bginewbackend/src/models/TransportSession.js:1)

Fields:

- `sessionId`: public shipment/session identifier like `TS-XXXX`
- `distributorId`: distributor user handling the transport
- `senderId`: source entity id
- `senderType`: `producer | processor | warehouse`
- `masterProductId`: product traceability id
- `productName`: product name
- `productType`: `short_shelf_life | medium_shelf_life | long_shelf_life | frozen | fragile`
- `quantity`: shipped quantity
- `pickupLocation`: `{ lat, lng }`
- `dropLocation`: `{ lat, lng }`
- `startedAt`: shipment start time
- `endedAt`: shipment end time
- `status`: `active | completed`
- `trackingPoints[]`: periodic sensor/location updates
- `createdAt`, `updatedAt`

Each `trackingPoint` contains:

- `timestamp`
- `location: { lat, lng }`
- `truckTemperature`
- `humidity`

### 2. TransportLifecycleEvent

Defined in [TransportLifecycleEvent.js](c:/javaFiles/bgihackathon/bginewbackend/src/models/TransportLifecycleEvent.js:1)

This stores timeline-style transport events for traceability:

- `TRANSPORT_STARTED`
- `TRANSPORT_UPDATE`
- `TRANSPORT_COMPLETED`

Each event stores:

- `sessionId`
- `masterProductId`
- `distributorId`
- `senderId`
- `senderType`
- `status`
- `payload`
- `createdAt`

## Authentication

Shipment APIs use the existing distributor authentication flow.

Distributor auth remains under:

- `POST /api/v1/distributor/register`
- `POST /api/v1/distributor/login`

Protected shipment APIs require:

```http
Authorization: Bearer <jwt_token>
```

The JWT role must be `distributor`.

## How The Flow Works

### Step 1. Distributor logs in

Distributor gets a JWT token from the existing login API.

### Step 2. Start shipment session

Frontend calls `POST /api/v1/distributor/start-session`.

Backend:

- validates request body
- verifies `senderId` exists for the given `senderType`
- creates a new `TransportSession`
- generates a `sessionId`
- sets `status = active`
- sets `startedAt`
- creates a `TRANSPORT_STARTED` lifecycle event

### Step 3. Send periodic tracking updates

Frontend or mobile app sends updates every 15s, 30s, or 60s using:

`POST /api/v1/distributor/update-tracking/:sessionId`

Backend:

- checks that the session belongs to the logged-in distributor
- checks that session status is `active`
- appends a new item into `trackingPoints[]`
- creates a `TRANSPORT_UPDATE` lifecycle event

### Step 4. Stop shipment

Frontend calls:

`POST /api/v1/distributor/stop-session/:sessionId`

Backend:

- checks that the session is still active
- sets `status = completed`
- sets `endedAt`
- creates a `TRANSPORT_COMPLETED` lifecycle event

### Step 5. View session or traceability

The distributor can fetch session details directly.

Public traceability also includes shipment sessions and shipment lifecycle events using `masterProductId`.

## API List

Routes are wired in [distributor.routes.js](c:/javaFiles/bgihackathon/bginewbackend/src/routes/distributor.routes.js:12)

### 1. Start Session

```http
POST /api/v1/distributor/start-session
```

Auth: distributor JWT required

Request body:

```json
{
  "masterProductId": "MP-1001",
  "senderId": "6825b7b2d8d7f44f1b5c1234",
  "senderType": "warehouse",
  "productName": "Milk Crate",
  "productType": "short_shelf_life",
  "quantity": 120,
  "pickupLocation": { "lat": 22.721, "lng": 75.861 },
  "dropLocation": { "lat": 22.744, "lng": 75.893 }
}
```

Success response:

```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "sessionId": "TS-AB12CD34EF",
  "distributorId": "6825b7b2d8d7f44f1b5c9999",
  "senderId": "6825b7b2d8d7f44f1b5c1234",
  "senderType": "warehouse",
  "masterProductId": "MP-1001",
  "productName": "Milk Crate",
  "productType": "short_shelf_life",
  "quantity": 120,
  "pickupLocation": { "lat": 22.721, "lng": 75.861 },
  "dropLocation": { "lat": 22.744, "lng": 75.893 },
  "startedAt": "2026-05-15T10:00:00.000Z",
  "status": "active",
  "trackingPoints": [],
  "createdAt": "2026-05-15T10:00:00.000Z",
  "updatedAt": "2026-05-15T10:00:00.000Z"
}
```

Possible errors:

- `400` validation failed
- `401` unauthorized
- `404` sender not found

### 2. Update Tracking

```http
POST /api/v1/distributor/update-tracking/:sessionId
```

Auth: distributor JWT required

Request body:

```json
{
  "lat": 22.731,
  "lng": 75.871,
  "truckTemperature": 7.2,
  "humidity": 65
}
```

Success response:

```json
{
  "sessionId": "TS-AB12CD34EF",
  "status": "active",
  "trackingPoint": {
    "timestamp": "2026-05-15T10:05:00.000Z",
    "location": {
      "lat": 22.731,
      "lng": 75.871
    },
    "truckTemperature": 7.2,
    "humidity": 65
  }
}
```

Possible errors:

- `400` validation failed
- `401` unauthorized
- `404` active session not found

### 3. Stop Session

```http
POST /api/v1/distributor/stop-session/:sessionId
```

Auth: distributor JWT required

Request body: none

Success response:

```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "sessionId": "TS-AB12CD34EF",
  "status": "completed",
  "endedAt": "2026-05-15T10:45:00.000Z"
}
```

Possible errors:

- `401` unauthorized
- `404` active session not found

### 4. Get One Session

```http
GET /api/v1/distributor/session/:sessionId
```

Auth: distributor JWT required

Success response:

```json
{
  "session": {
    "sessionId": "TS-AB12CD34EF",
    "status": "completed",
    "masterProductId": "MP-1001",
    "trackingPoints": []
  },
  "lifecycleEvents": [
    {
      "eventType": "TRANSPORT_STARTED",
      "createdAt": "2026-05-15T10:00:00.000Z"
    },
    {
      "eventType": "TRANSPORT_UPDATE",
      "createdAt": "2026-05-15T10:05:00.000Z"
    },
    {
      "eventType": "TRANSPORT_COMPLETED",
      "createdAt": "2026-05-15T10:45:00.000Z"
    }
  ]
}
```

Possible errors:

- `401` unauthorized
- `404` transport session not found

### 5. Get My Sessions

```http
GET /api/v1/distributor/my-sessions
```

Auth: distributor JWT required

Success response:

```json
[
  {
    "sessionId": "TS-AB12CD34EF",
    "masterProductId": "MP-1001",
    "status": "completed"
  },
  {
    "sessionId": "TS-ZZ98XY77PQ",
    "masterProductId": "MP-2002",
    "status": "active"
  }
]
```

## Validation Rules

Validation is defined in [transportSession.validator.js](c:/javaFiles/bgihackathon/bginewbackend/src/validators/transportSession.validator.js:1)

Important rules:

- `senderId` must be a valid MongoDB object id
- `senderType` must be one of `producer`, `processor`, `warehouse`
- `productType` must match allowed enum values
- `quantity` must be greater than `0`
- `pickupLocation.lat` must be between `-90` and `90`
- `pickupLocation.lng` must be between `-180` and `180`
- `dropLocation.lat` must be between `-90` and `90`
- `dropLocation.lng` must be between `-180` and `180`
- tracking update `lat/lng` must also be valid coordinates
- `humidity` must be between `0` and `100`

## Traceability Integration

Public traceability is enriched in [public.controller.js](c:/javaFiles/bgihackathon/bginewbackend/src/controllers/public.controller.js:59)

The response now includes:

- `transport.sessions`
- `transport.lifecycle`

This means a QR scan can show:

- when transport started
- route points collected during shipment
- transport completion time
- cold-chain conditions like temperature and humidity

## Admin Visibility

Admin distributor details are enriched in [admin.controller.js](c:/javaFiles/bgihackathon/bginewbackend/src/controllers/admin.controller.js:223)

Distributor dashboard detail response now includes:

- `history`
- `transportSessions`
- `lifecycleEvents`

## Best Practices For Mobile Tracking

- Send updates every `30s` by default for MVP balance
- Use `15s` only for very sensitive products
- Pause updates when network is unavailable and retry in order
- Always call `stop-session` when the destination is reached
- Keep payloads small and numeric

Recommended mobile flow:

1. Start session once pickup is confirmed
2. Poll GPS + sensor data locally
3. Push updates on interval
4. Stop session at delivery

## Scalability Notes

This design is lightweight but still scalable for MVP:

- one collection for sessions
- one collection for lifecycle events
- indexed by `sessionId`, `distributorId`, and `masterProductId`
- REST-only, no sockets or brokers required
- deployable as a single Node.js app on EC2

## Future Upgrade Ideas

- add `pickupAddress` and `dropAddress`
- add `vehicleId`, `driverName`, `routeName`
- store geofence breach alerts
- compress or archive old tracking points
- hash lifecycle events for blockchain anchoring later

## Related Files

- [TransportSession.js](c:/javaFiles/bgihackathon/bginewbackend/src/models/TransportSession.js:1)
- [TransportLifecycleEvent.js](c:/javaFiles/bgihackathon/bginewbackend/src/models/TransportLifecycleEvent.js:1)
- [transportSession.service.js](c:/javaFiles/bgihackathon/bginewbackend/src/services/transportSession.service.js:1)
- [transportSession.controller.js](c:/javaFiles/bgihackathon/bginewbackend/src/controllers/transportSession.controller.js:1)
- [transportSession.validator.js](c:/javaFiles/bgihackathon/bginewbackend/src/validators/transportSession.validator.js:1)
- [distributor.routes.js](c:/javaFiles/bgihackathon/bginewbackend/src/routes/distributor.routes.js:1)
- [public.controller.js](c:/javaFiles/bgihackathon/bginewbackend/src/controllers/public.controller.js:1)
- [openapi.yaml](c:/javaFiles/bgihackathon/bginewbackend/openapi.yaml:582)
