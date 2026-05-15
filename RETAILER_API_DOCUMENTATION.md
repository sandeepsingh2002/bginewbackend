# Retailer API Documentation

Base path: `/api/v1/retailer`

## Authentication APIs

### 1. Register Retailer

- Method: `POST`
- URL: `/api/v1/retailer/register`
- Auth: Not required

Request body:

```json
{
  "name": "Ravi Sharma",
  "email": "retailer@example.com",
  "password": "secure123",
  "storeName": "Fresh Mart",
  "storeLocation": "MG Road, Indore",
  "geoLocation": {
    "lat": 22.7196,
    "lng": 75.8577
  }
}
```

Success response `201`:

```json
{
  "id": "6825b7b2d8d7f44f1b5c9999"
}
```

Error responses:
- `400` invalid `geoLocation`
- `409` email already exists

### 2. Login Retailer

- Method: `POST`
- URL: `/api/v1/retailer/login`
- Auth: Not required

Request body:

```json
{
  "email": "retailer@example.com",
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
- `401` invalid credentials

## Protected Retailer APIs

Use:

`Authorization: Bearer <jwt_token>`

JWT role must be `retailer`.

### 3. Scan By Trace ID (QR Scan Helper)

- Method: `GET`
- URL: `/api/v1/retailer/scan/:traceId`
- Auth: Required (`retailer`)

Purpose:
- Retailer scans QR that contains `traceId`.
- API returns warehouse batch data, warehouse details, and product summary.

Path params:
- `traceId` (MongoDB ObjectId, required)

Success response `200`:

```json
{
  "traceId": "6825c9c3f2d9dbe9b7331111",
  "batch": {
    "batchId": "WB-A1B2C3D4E5",
    "masterProductId": "MP-1001",
    "productName": "Milk Crate",
    "productType": "short_shelf_life",
    "quantity": 120,
    "status": "debited",
    "scannedAt": "2026-05-15T11:00:00.000Z",
    "debitedAt": "2026-05-15T23:00:00.000Z",
    "environmentalRecords": [
      {
        "timestamp": "2026-05-15T12:00:00.000Z",
        "temperature": 4.5,
        "humidity": 68
      }
    ]
  },
  "warehouse": {
    "name": "Warehouse Manager",
    "warehouseName": "Central Cold Storage",
    "location": "Industrial Area",
    "email": "warehouse@example.com"
  },
  "product": {
    "masterProductId": "MP-1001",
    "productName": "Milk Crate",
    "productType": "dairy",
    "quantity": 120,
    "quantityUnit": "kg"
  },
  "canAccept": true,
  "alreadyAccepted": false
}
```

Error responses:
- `400` invalid traceId
- `401` unauthorized
- `404` trace batch not found

### 4. Accept Product By Trace ID

- Method: `POST`
- URL: `/api/v1/retailer/accept/:traceId`
- Auth: Required (`retailer`)

Purpose:
- Marks receiver acceptance date/time after scan.
- Stores retailer stop on product and creates retailer history record.

Path params:
- `traceId` (MongoDB ObjectId, required)

Request body:

```json
{
  "receivedAt": "2026-05-16T10:30:00.000Z",
  "shelfLocation": "A-12",
  "notes": "Received in good condition"
}
```

Success response `200`:

```json
{
  "traceId": "6825c9c3f2d9dbe9b7331111",
  "masterProductId": "MP-1001",
  "retailerStop": {
    "retailerId": "6825b7b2d8d7f44f1b5c9999",
    "receivedAt": "2026-05-16T10:30:00.000Z",
    "shelfLocation": "A-12",
    "notes": "Received in good condition"
  }
}
```

Error responses:
- `400` invalid traceId or invalid/missing `receivedAt`
- `401` unauthorized
- `404` trace batch not found / product not found
- `409` leg 2 not completed / already accepted

### 5. Receive Product By Master Product ID (Legacy Route)

- Method: `POST`
- URL: `/api/v1/retailer/receive`
- Auth: Required (`retailer`)

Request body:

```json
{
  "masterProductId": "MP-1001",
  "receivedAt": "2026-05-16T10:30:00.000Z",
  "shelfLocation": "A-12",
  "notes": "Received in good condition"
}
```

Success response `200`:

```json
{
  "retailerId": "6825b7b2d8d7f44f1b5c9999",
  "receivedAt": "2026-05-16T10:30:00.000Z",
  "shelfLocation": "A-12",
  "notes": "Received in good condition"
}
```

Error responses:
- `401` unauthorized
- `404` product not found
- `409` leg 2 not completed / already accepted

### 6. Get Retailer History

- Method: `GET`
- URL: `/api/v1/retailer/history`
- Auth: Required (`retailer`)

Success response `200`:

```json
[
  {
    "_id": "6825d0f1f2d9dbe9b7334444",
    "retailerId": "6825b7b2d8d7f44f1b5c9999",
    "masterProductId": "MP-1001",
    "receivedAt": "2026-05-16T10:30:00.000Z",
    "shelfLocation": "A-12",
    "notes": "Received in good condition",
    "createdAt": "2026-05-16T10:30:05.000Z"
  }
]
```

Error responses:
- `401` unauthorized

## Recommended Retailer QR Flow

1. Scan QR and read `traceId`
2. Call `GET /api/v1/retailer/scan/:traceId`
3. Show warehouse condition and product details
4. On acceptance, call `POST /api/v1/retailer/accept/:traceId` with `receivedAt`
5. Use `GET /api/v1/retailer/history` for audit/history view
