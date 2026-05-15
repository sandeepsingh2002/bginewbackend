# Warehouse API Documentation

Base path: `/api/v1/warehouse`

## Authentication APIs

### 1. Register Warehouse

- Method: `POST`
- URL: `/api/v1/warehouse/register`
- Auth: Not required

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

Success response `201`:

```json
{
  "id": "6825b7b2d8d7f44f1b5c1234"
}
```

Error responses:
- `400` Validation error / invalid `geoLocation`
- `409` Email already exists

### 2. Login Warehouse

- Method: `POST`
- URL: `/api/v1/warehouse/login`
- Auth: Not required

Request body:

```json
{
  "email": "warehouse@example.com",
  "password": "secure123"
}
```

Success response `200`:

```json
{
  "token": "jwt_token_here"
}
```

Error responses:
- `400` Validation error
- `401` Invalid credentials

## Batch APIs

For protected routes, send:

`Authorization: Bearer <token>`

JWT role must be `warehouse`.

### 3. Scan Transport Session to Create Batch

- Method: `POST`
- URL: `/api/v1/warehouse/scan/:sessionId`
- Auth: Required (`warehouse`)

Path params:
- `sessionId` (string, required)

Request body: none

Success response `201`:

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

Error responses:
- `400` Session not completed
- `401` Unauthorized
- `404` Session not found
- `409` Batch already scanned for this session
- `500` Failed to fetch transport session

### 4. Add Environmental Record

- Method: `POST`
- URL: `/api/v1/warehouse/environment/:batchId`
- Auth: Required (`warehouse`)

Path params:
- `batchId` (string, required)

Request body:

```json
{
  "temperature": 4.5,
  "humidity": 68
}
```

Success response `200`:

```json
{
  "batchId": "WB-A1B2C3D4E5",
  "status": "in_inventory",
  "recordAdded": true
}
```

Error responses:
- `400` Validation error
- `401` Unauthorized
- `404` Active batch not found in your inventory

### 5. Debit Batch (Out of Inventory)

- Method: `POST`
- URL: `/api/v1/warehouse/debit/:batchId`
- Auth: Required (`warehouse`)

Path params:
- `batchId` (string, required)

Request body: none

Success response `200`:

```json
{
  "batchId": "WB-A1B2C3D4E5",
  "traceId": "6825c9c3f2d9dbe9b7331111"
}
```

Error responses:
- `401` Unauthorized
- `404` Active batch not found in your inventory

### 6. Trace Batch (Public)

- Method: `GET`
- URL: `/api/v1/warehouse/batch/:batchId`
- Auth: Not required

Path params:
- `batchId` (string, required)

Success response `200`:

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
    }
  ],
  "timeInWarehouseHours": 12,
  "createdAt": "2026-05-15T11:00:00.000Z",
  "updatedAt": "2026-05-15T23:00:00.000Z"
}
```

Error responses:
- `404` Batch not found

### 7. Get My Batches

- Method: `GET`
- URL: `/api/v1/warehouse/my-batches`
- Auth: Required (`warehouse`)

Success response `200`:

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
  }
]
```

Error responses:
- `401` Unauthorized

### 8. Trace Batch By Trace ID (Public)

- Method: `GET`
- URL: `/api/v1/warehouse/trace/:traceId`
- Auth: Not required

Path params:
- `traceId` (MongoDB ObjectId string, required)

Success response `200`:

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

Error responses:
- `400` invalid traceId
- `404` batch not found

## Validation Summary

- `name`: required
- `email`: valid email
- `password`: min 6 chars for register
- `warehouseName`: required
- `location`: required
- `geoLocation.lat`: number between `-90` and `90`
- `geoLocation.lng`: number between `-180` and `180`
- `sessionId`: required path param
- `batchId`: required path param
- `traceId`: valid MongoDB ObjectId path param
- `temperature`: numeric
- `humidity`: number between `0` and `100`

## Integration Dependency

`scan` API calls distributor service:

`GET /api/v1/distributor/session/:sessionId`

Environment variable:

`DISTRIBUTOR_API_URL=http://localhost:5000`

If not provided, service defaults to `http://localhost:5000`.
