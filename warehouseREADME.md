# Warehouse Inventory Management System v2

This document explains the warehouse inventory management system with batch tracking and environmental monitoring.

## Overview

The warehouse system manages inventory using a batch-based approach where each shipment becomes a tracked batch. The system provides:

- Warehouse authentication (register/login)
- Batch scanning from completed transport sessions
- Hourly environmental monitoring (temperature/humidity)
- Batch debiting (out-inventory tracking)
- Full batch traceability with environmental history

## Core Models

### 1. Warehouse

Defined in [Warehouse.js](src/models/Warehouse.js)

Fields:
- `name`: warehouse manager name
- `email`: unique email for login
- `passwordHash`: hashed password
- `warehouseName`: warehouse facility name
- `location`: warehouse address
- `geoLocation`: `{ lat, lng }`
- `isVerified`: admin verification status
- `verifiedAt`, `verifiedBy`: verification metadata
- `createdAt`: registration timestamp

### 2. WarehouseBatch

Defined in [WarehouseBatch.js](src/models/WarehouseBatch.js)

Fields:
- `batchId`: unique batch identifier like `WB-XXXX`
- `warehouseId`: warehouse owner reference
- `sessionId`: transport session identifier
- `masterProductId`: product traceability id
- `productName`: product name
- `productType`: product category
- `quantity`: batch quantity
- `chainId`: blockchain chain identifier
- `scannedAt`: timestamp when batch entered inventory
- `debitedAt`: timestamp when batch left inventory
- `status`: `in_inventory | debited`
- `environmentalRecords[]`: hourly temp/humidity logs
- `createdAt`, `updatedAt`: timestamps

Each `environmentalRecord` contains:
- `timestamp`: record time
- `temperature`: warehouse temperature
- `humidity`: warehouse humidity percentage

## Authentication

### Register

```http
POST /api/v1/warehouse/register
```

Request body:
```json
{
  "name": "John Doe",
  "email": "warehouse@example.com",
  "password": "secure123",
  "warehouseName": "Central Cold Storage",
  "location": "123 Industrial Area, City",
  "geoLocation": {
    "lat": 22.7196,
    "lng": 75.8577
  }
}
```

Success response (201):
```json
{
  "id": "6825b7b2d8d7f44f1b5c1234"
}
```

Possible errors:
- `400` validation failed or invalid geoLocation
- `409` email already exists

### Login

```http
POST /api/v1/warehouse/login
```

Request body:
```json
{
  "email": "warehouse@example.com",
  "password": "secure123"
}
```

Success response (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Possible errors:
- `401` invalid credentials

## Batch Operations

All batch operations require authentication:
```http
Authorization: Bearer <jwt_token>
```

The JWT role must be `warehouse`.

### 1. Scan Batch (Add to Inventory)

```http
POST /api/v1/warehouse/scan/:sessionId
```

Auth: warehouse JWT required

This API:
1. Fetches transport session details from distributor API
2. Validates session is completed
3. Creates a new batch in warehouse inventory
4. Extracts product details from transport session

Path parameters:
- `sessionId`: transport session identifier (e.g., `TS-AB12CD34EF`)

Request body: none

Success response (201):
```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "batchId": "WB-A1B2C3D4E5",
  "warehouseId": "6825b7b2d8d7f44f1b5c1234",
  "sessionId": "TS-AB12CD34EF",
  "masterProductId": "MP-1001",
  "productName": "Milk Crate",
  "productType": "short_shelf_life",
  "quantity": 120,
  "chainId": "0x1a2b3c4d5e6f",
  "scannedAt": "2026-05-15T11:00:00.000Z",
  "status": "in_inventory",
  "environmentalRecords": [],
  "createdAt": "2026-05-15T11:00:00.000Z",
  "updatedAt": "2026-05-15T11:00:00.000Z"
}
```

Possible errors:
- `400` transport session not completed yet
- `401` unauthorized
- `404` transport session not found
- `409` batch already scanned for this session

### 2. Update Environmental Conditions

```http
POST /api/v1/warehouse/environment/:batchId
```

Auth: warehouse JWT required

This API logs hourly temperature and humidity readings for a batch in inventory.

Path parameters:
- `batchId`: warehouse batch identifier (e.g., `WB-A1B2C3D4E5`)

Request body:
```json
{
  "temperature": 4.5,
  "humidity": 68
}
```

Success response (200):
```json
{
  "batchId": "WB-A1B2C3D4E5",
  "status": "in_inventory",
  "recordAdded": true
}
```

Possible errors:
- `400` validation failed (humidity must be 0-100)
- `401` unauthorized
- `404` active batch not found in your inventory

### 3. Debit Batch (Out-Inventory)

```http
POST /api/v1/warehouse/debit/:batchId
```

Auth: warehouse JWT required

This API marks a batch as taken out of inventory. Once debited, the batch cannot receive further environmental updates.

Path parameters:
- `batchId`: warehouse batch identifier (e.g., `WB-A1B2C3D4E5`)

Request body: none

Success response (200):
```json
{
  "batchId": "WB-A1B2C3D4E5",
  "traceId": "6825c9c3f2d9dbe9b7331111"
}
```

The `traceId` can be used to retrieve full batch history.

Possible errors:
- `401` unauthorized
- `404` active batch not found in your inventory

### 4. Trace Batch (Get Full History)

```http
GET /api/v1/warehouse/batch/:batchId
```

Auth: not required (public traceability)

This API retrieves complete batch details including all environmental records and time spent in warehouse.

Path parameters:
- `batchId`: warehouse batch identifier (e.g., `WB-A1B2C3D4E5`)

Success response (200):
```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "batchId": "WB-A1B2C3D4E5",
  "warehouseId": "6825b7b2d8d7f44f1b5c1234",
  "sessionId": "TS-AB12CD34EF",
  "masterProductId": "MP-1001",
  "productName": "Milk Crate",
  "productType": "short_shelf_life",
  "quantity": 120,
  "chainId": "0x1a2b3c4d5e6f",
  "scannedAt": "2026-05-15T11:00:00.000Z",
  "debitedAt": "2026-05-15T23:00:00.000Z",
  "status": "debited",
  "environmentalRecords": [
    {
      "timestamp": "2026-05-15T12:00:00.000Z",
      "temperature": 4.5,
      "humidity": 68
    },
    {
      "timestamp": "2026-05-15T13:00:00.000Z",
      "temperature": 4.3,
      "humidity": 67
    },
    {
      "timestamp": "2026-05-15T14:00:00.000Z",
      "temperature": 4.6,
      "humidity": 69
    }
  ],
  "timeInWarehouseHours": 12,
  "createdAt": "2026-05-15T11:00:00.000Z",
  "updatedAt": "2026-05-15T23:00:00.000Z"
}
```

Possible errors:
- `404` batch not found

### 5. Trace Batch by traceId (Get Full History)

```http
GET /api/v1/warehouse/trace/:traceId
```

Auth: not required (public traceability)

This API retrieves complete batch details using the `traceId` returned by debit API.

Path parameters:
- `traceId`: MongoDB ObjectId returned by debit API (e.g., `6825c9c3f2d9dbe9b7331111`)

Success response (200):
```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "batchId": "WB-A1B2C3D4E5",
  "masterProductId": "MP-1001",
  "productName": "Milk Crate",
  "quantity": 120,
  "status": "debited",
  "environmentalRecords": [
    {
      "timestamp": "2026-05-15T12:00:00.000Z",
      "temperature": 4.5,
      "humidity": 68
    }
  ],
  "timeInWarehouseHours": 12
}
```

Possible errors:
- `400` invalid traceId
- `404` batch not found

### 6. Get My Batches

```http
GET /api/v1/warehouse/my-batches
```

Auth: warehouse JWT required

This API returns all batches managed by the authenticated warehouse.

Success response (200):
```json
[
  {
    "_id": "6825c9c3f2d9dbe9b7331111",
    "batchId": "WB-A1B2C3D4E5",
    "masterProductId": "MP-1001",
    "productName": "Milk Crate",
    "quantity": 120,
    "status": "debited",
    "scannedAt": "2026-05-15T11:00:00.000Z",
    "debitedAt": "2026-05-15T23:00:00.000Z"
  },
  {
    "_id": "6825c9c3f2d9dbe9b7332222",
    "batchId": "WB-Z9Y8X7W6V5",
    "masterProductId": "MP-2002",
    "productName": "Cheese Blocks",
    "quantity": 50,
    "status": "in_inventory",
    "scannedAt": "2026-05-16T08:00:00.000Z",
    "debitedAt": null
  }
]
```

## Validation Rules

Validation is defined in [warehouse.validator.js](src/validators/warehouse.validator.js)

### Registration
- `name` must not be empty
- `email` must be valid email format
- `password` must be at least 6 characters
- `warehouseName` must not be empty
- `location` must not be empty
- `geoLocation.lat` must be between `-90` and `90`
- `geoLocation.lng` must be between `-180` and `180`

### Environmental Update
- `temperature` must be a number
- `humidity` must be between `0` and `100`

### Path Parameters
- `sessionId` must not be empty
- `batchId` must not be empty
- `traceId` must be a valid MongoDB ObjectId

## Typical Workflow

### Step 1: Warehouse Registration
Warehouse manager registers using the register API.

### Step 2: Warehouse Login
Warehouse manager logs in and receives JWT token.

### Step 3: Scan Incoming Shipment
When a distributor completes delivery:
1. Distributor stops transport session (gets `sessionId`)
2. Warehouse scans the `sessionId` using scan API
3. System creates a new batch in inventory

### Step 4: Environmental Monitoring
Every hour, warehouse staff or automated sensors:
1. Record current temperature and humidity
2. Send update to environment API with `batchId`
3. System appends record to batch history

### Step 5: Debit Batch
When batch is taken out for next shipment or sale:
1. Warehouse calls debit API with `batchId`
2. System marks batch as `debited` and records `debitedAt`
3. System returns `traceId` for traceability

### Step 6: Traceability
Anyone can trace batch history:
1. Use trace API with `batchId`
2. View complete environmental history
3. See total time spent in warehouse
4. Or use trace API with `traceId` directly from debit response

## Integration with Transport System

The warehouse system integrates with the distributor transport system:

1. **Scan API** fetches session details from:
   ```
   GET /api/v1/distributor/session/:sessionId
   ```

2. The session must have `status: 'completed'`

3. Batch inherits these fields from transport session:
   - `masterProductId`
   - `productName`
   - `productType`
   - `quantity`
   - `chainId`

## Environment Variables

Required configuration:

```env
DISTRIBUTOR_API_URL=http://localhost:5000
```

If not set, defaults to `http://localhost:5000`.

## Best Practices

### Environmental Monitoring
- Record temperature/humidity every 1 hour
- Use automated sensors when possible
- Ensure readings are accurate before submission
- Monitor cold chain compliance for sensitive products

### Batch Management
- Scan batches immediately upon arrival
- Verify session is completed before scanning
- Debit batches promptly when taken out
- Keep `batchId` for traceability records

### Security
- Store JWT tokens securely
- Use HTTPS in production
- Rotate passwords regularly
- Verify warehouse staff before granting access

## Error Handling

All APIs follow consistent error response format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` Success
- `201` Created
- `400` Bad Request (validation failed)
- `401` Unauthorized (invalid or missing token)
- `404` Not Found
- `409` Conflict (duplicate entry)
- `500` Internal Server Error

## Scalability Notes

This design is optimized for MVP deployment:

- Single collection for batches
- Indexed by `batchId`, `warehouseId`, `sessionId`, `masterProductId`
- Environmental records stored as embedded array (suitable for hourly logs)
- REST-only, no real-time requirements
- Deployable as part of main Node.js app

## Future Enhancements

- Add batch transfer between warehouses
- Implement automated alerts for temperature breaches
- Add batch expiry tracking based on product type
- Compress old environmental records for long-term storage
- Add batch splitting/merging capabilities
- Integrate with blockchain for immutable audit trail

## Related Files

- [Warehouse.js](src/models/Warehouse.js) - Warehouse user model
- [WarehouseBatch.js](src/models/WarehouseBatch.js) - Batch inventory model
- [warehouse.service.js](src/services/warehouse.service.js) - Business logic layer
- [warehouse.controller.js](src/controllers/warehouse.controller.js) - API controllers
- [warehouse.validator.js](src/validators/warehouse.validator.js) - Input validation
- [warehouse.routes.js](src/routes/warehouse.routes.js) - Route definitions
- [TransportSession.js](src/models/TransportSession.js) - Transport session model
- [shipmentREADME.md](shipmentREADME.md) - Transport system documentation
