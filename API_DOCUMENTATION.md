# Smart Traceability Backend API Documentation

## Base Information
- Base URL: `/api/v1`
- Content-Type: `application/json`
- Auth header (protected routes): `Authorization: Bearer <JWT>`

## Common Response Types
- `401 Unauthorized`: `{ "error": "Unauthorized" }` or `{ "error": "Invalid token" }` or `{ "error": "Invalid credentials" }`
- `403 Forbidden`: `{ "error": "Forbidden" }` or `{ "error": "Account pending admin verification" }`
- `404 Not Found`: Role/resource specific error
- `409 Conflict`: Duplicate or invalid state transitions
- `500 Internal Server Error`: `{ "error": "Internal server error" }`

## Health
### GET `/health`
- Auth: No
- Response `200`:
```json
{ "ok": true }
```

---

## Admin APIs
Base path: `/api/v1/admin`

### POST `/login`
- Auth: No
- Body:
```json
{
  "email": "string",
  "password": "string"
}
```
- Success `200`:
```json
{ "token": "string" }
```

### GET `/producers/pending`
- Auth: `admin`
- Success `200`: `Producer[]` (without `passwordHash`)

### PATCH `/producers/:producerId/verify`
- Auth: `admin`
- Path params:
  - `producerId: string (Mongo ObjectId)`
- Success `200`: `Producer` (without `passwordHash`, with `isVerified=true`)
- Error `404`: `{ "error": "Producer not found" }`

### GET `/products`
- Auth: `admin`
- Success `200`: `ProcessedProduct[]`

### GET `/producers`
- Auth: `admin`
- Success `200`: `Producer[]` (without `passwordHash`)

---

## Producer APIs
Base path: `/api/v1/producer`

### POST `/register`
- Auth: No
- Body:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "producerType": "farmer | wood_collector | dairy_meat_producer"
}
```
- Success `201`:
```json
{
  "id": "string",
  "isVerified": false
}
```
- Error `400`: `{ "error": "Missing fields" }`
- Error `409`: `{ "error": "Email already exists" }`

### POST `/login`
- Auth: No
- Body:
```json
{
  "email": "string",
  "password": "string"
}
```
- Success `200`:
```json
{ "token": "string" }
```

### GET `/me`
- Auth: `producer`
- Success `200`: `Producer` (without `passwordHash`)
- Error `404`: `{ "error": "Producer not found" }`

### POST `/products`
- Auth: `producer` + verified account required
- Body: depends on logged-in producer's `producerType`

`farmer` body:
```json
{
  "cropName": "string",
  "quantity": 0,
  "quantityUnit": "string",
  "geoLocation": { "lat": 0, "lng": 0 },
  "farmSizeAcres": 0,
  "pesticideUsed": true,
  "pesticideDetails": "string",
  "harvestDate": "ISO date",
  "organicCertified": true
}
```

`wood_collector` body:
```json
{
  "woodType": "string",
  "quantity": 0,
  "quantityUnit": "string",
  "forestRegion": "string",
  "geoLocation": { "lat": 0, "lng": 0 },
  "harvestDate": "ISO date",
  "sustainabilityCertified": true
}
```

`dairy_meat_producer` body:
```json
{
  "productType": "string",
  "animalBreed": "string",
  "quantity": 0,
  "quantityUnit": "string",
  "farmLocation": { "lat": 0, "lng": 0 },
  "antibioticsUsed": true,
  "feedType": "string",
  "collectionDate": "ISO date"
}
```

- Success `201`:
```json
{
  "rawProductId": "RAW-xxxxxxxxxx",
  "qrCodeUrl": "string"
}
```
- Error `400`: `{ "error": "Unsupported producer type" }`
- Error `403`: `{ "error": "Account pending admin verification" }`

### GET `/products`
- Auth: `producer`
- Success `200`: `RawProduct[]`

---

## Processor APIs
Base path: `/api/v1/processor`

### POST `/register`
- Auth: No
- Body:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "companyName": "string"
}
```
- Success `201`: `{ "id": "string" }`
- Error `409`: `{ "error": "Email already exists" }`

### POST `/login`
- Auth: No
- Body: `{ "email": "string", "password": "string" }`
- Success `200`: `{ "token": "string" }`

### POST `/batches`
- Auth: `processor`
- Success `201`: `Batch`

### POST `/batches/:batchId/scan`
- Auth: `processor`
- Path params:
  - `batchId: string`
- Body:
```json
{ "rawProductId": "RAW-xxxxxxxxxx" }
```
- Success `200`: updated `Batch`
- Error `404`: `{ "error": "Open batch not found" }`
- Error `409`: `{ "error": "Raw product unavailable" }` or `{ "error": "Already scanned into this batch" }`

### GET `/batches/:batchId`
- Auth: `processor`
- Success `200`:
```json
{
  "batch": "Batch object",
  "rawProducts": ["RawProduct objects"]
}
```
- Error `404`: `{ "error": "Batch not found" }`

### POST `/batches/:batchId/close`
- Auth: `processor`
- Success `200`: updated `Batch`
- Error `404`: `{ "error": "Open batch not found" }`

### POST `/products`
- Auth: `processor`
- Body:
```json
{
  "productName": "string",
  "productCategory": "string",
  "totalQuantityProduced": 0,
  "quantityUnit": "string",
  "inputBatches": [
    { "batchId": "BATCH-xxxxxxxxxx", "materialDescription": "string" }
  ],
  "manufacturingDate": "ISO date",
  "expiryDate": "ISO date",
  "otherIngredients": ["string"]
}
```
- Success `201`:
```json
{
  "masterProductId": "MPID-xxxxxxxxxx",
  "qrCodeUrl": "string"
}
```
- Error `400`: `{ "error": "All input batches must be closed and belong to processor" }`

### GET `/products`
- Auth: `processor`
- Success `200`: `ProcessedProduct[]`

---

## Distributor APIs
Base path: `/api/v1/distributor`

### POST `/register`
- Auth: No
- Body:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "companyName": "string"
}
```
- Success `201`: `{ "id": "string" }`
- Error `409`: `{ "error": "Email already exists" }`

### POST `/login`
- Auth: No
- Body: `{ "email": "string", "password": "string" }`
- Success `200`: `{ "token": "string" }`

### POST `/scan`
- Auth: `distributor`
- Body:
```json
{ "masterProductId": "MPID-xxxxxxxxxx" }
```
- Success `200`:
```json
{
  "masterProductId": "string",
  "nextLeg": "leg1 | leg2 | warehouse_pending"
}
```
- Error `404`: `{ "error": "Product not found" }`

### POST `/dispatch/leg1`
- Auth: `distributor`
- Body:
```json
{
  "masterProductId": "string",
  "dispatchedAt": "ISO datetime",
  "vehicleId": "string",
  "startTemp": 0,
  "startHumidity": 0,
  "notes": "string"
}
```
- Success `200`: updated `ProcessedProduct`
- Error `409`: `{ "error": "Leg 1 already assigned or product missing" }`

### PATCH `/dispatch/leg1/:masterProductId/received`
- Auth: `distributor`
- Body:
```json
{
  "receivedAt": "ISO datetime",
  "endTemp": 0,
  "endHumidity": 0
}
```
- Success `200`: `distributionLeg1` object
- Error `404`: `{ "error": "Leg 1 dispatch not found" }`

### POST `/dispatch/leg2`
- Auth: `distributor`
- Body:
```json
{
  "masterProductId": "string",
  "dispatchedAt": "ISO datetime",
  "vehicleId": "string",
  "startTemp": 0,
  "startHumidity": 0,
  "notes": "string"
}
```
- Success `200`: updated `ProcessedProduct`
- Error `404`: `{ "error": "Product not found" }`
- Error `409`: `{ "error": "Warehouse dispatch required first" }` or `{ "error": "Leg 2 already assigned" }`

### PATCH `/dispatch/leg2/:masterProductId/received`
- Auth: `distributor`
- Body:
```json
{
  "receivedAt": "ISO datetime",
  "endTemp": 0,
  "endHumidity": 0
}
```
- Success `200`: `distributionLeg2` object
- Error `404`: `{ "error": "Leg 2 dispatch not found" }`

### GET `/history`
- Auth: `distributor`
- Success `200`: `DistributorHistory[]`

---

## Warehouse APIs
Base path: `/api/v1/warehouse`

### POST `/register`
- Auth: No
- Body:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "warehouseName": "string",
  "location": "string"
}
```
- Success `201`: `{ "id": "string" }`

### POST `/login`
- Auth: No
- Body: `{ "email": "string", "password": "string" }`
- Success `200`: `{ "token": "string" }`

### POST `/receive`
- Auth: `warehouse`
- Body:
```json
{
  "masterProductId": "string",
  "receivedAt": "ISO datetime",
  "quantityReceived": 0,
  "storageTemp": 0,
  "storageHumidity": 0,
  "notes": "string"
}
```
- Success `200`: `warehouseStop` object
- Error `404`: `{ "error": "Product not found" }`
- Error `409`: `{ "error": "Leg 1 must be completed first" }` or `{ "error": "Warehouse stop already filled" }`

### PATCH `/dispatch/:masterProductId`
- Auth: `warehouse`
- Body:
```json
{ "dispatchedAt": "ISO datetime" }
```
- Success `200`: updated `warehouseStop` object
- Error `404`: `{ "error": "Warehouse record not found" }`

### GET `/history`
- Auth: `warehouse`
- Success `200`: `WarehouseHistory[]`

---

## Retailer APIs
Base path: `/api/v1/retailer`

### POST `/register`
- Auth: No
- Body:
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "storeName": "string",
  "storeLocation": "string"
}
```
- Success `201`: `{ "id": "string" }`

### POST `/login`
- Auth: No
- Body: `{ "email": "string", "password": "string" }`
- Success `200`: `{ "token": "string" }`

### POST `/receive`
- Auth: `retailer`
- Body:
```json
{
  "masterProductId": "string",
  "receivedAt": "ISO datetime",
  "shelfLocation": "string",
  "notes": "string"
}
```
- Success `200`: `retailerStop` object
- Error `404`: `{ "error": "Product not found" }`
- Error `409`: `{ "error": "Leg 2 must be completed first" }` or `{ "error": "Retailer stop already filled" }`

### GET `/history`
- Auth: `retailer`
- Success `200`: `RetailerHistory[]`

---

## Public APIs
Base path: `/api/v1/public`

### GET `/product/:masterProductId`
- Auth: No
- Success `200`: Enriched traceability object containing:
  - `ProcessedProduct` base fields
  - `processor: { companyName }`
  - `inputBatches[].rawProducts[]` with `producerName`
  - `warehouseStop.warehouseName`
  - `retailerStop.storeName`
- Error `404`: `{ "error": "Product not found" }`

### GET `/product/raw/:rawProductId`
- Auth: No
- Success `200`: `RawProduct` + `producerName`
- Error `404`: `{ "error": "Raw product not found" }`

---

## Data Type Reference (Current Implementation)

### Producer
```ts
{
  _id: string;
  name: string;
  email: string;
  producerType: 'farmer' | 'wood_collector' | 'dairy_meat_producer';
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
}
```

### RawProduct
```ts
{
  _id: string;
  rawProductId: string;
  producerId: string;
  producerType: string;
  farmFields?: object;
  woodFields?: object;
  dairyMeatFields?: object;
  qrCodeUrl?: string;
  status: 'available' | 'in_batch';
  createdAt: string;
}
```

### Batch
```ts
{
  _id: string;
  batchId: string;
  processorId: string;
  rawProductIds: string[];
  status: 'open' | 'closed';
  closedAt?: string;
  createdAt: string;
}
```

### ProcessedProduct
```ts
{
  _id: string;
  masterProductId: string;
  processorId: string;
  productName: string;
  productCategory: string;
  totalQuantityProduced: number;
  quantityUnit: string;
  inputBatches: { batchId: string; materialDescription: string }[];
  manufacturingDate?: string;
  expiryDate?: string;
  otherIngredients?: string[];
  qrCodeUrl?: string;
  distributionLeg1?: object;
  warehouseStop?: object;
  distributionLeg2?: object;
  retailerStop?: object;
  createdAt: string;
}
```

### DistributorHistory / WarehouseHistory / RetailerHistory / ProcessorHistory
- Standard Mongo document with `_id`, role-specific fields, `createdAt`.

---

## Notes
- Validation is currently minimal and mostly state-based (not strict schema validation on every request field).
- JWT payload shape:
  - admin: `{ userId, role: 'admin' }`
  - producer: `{ userId, role: 'producer', producerType }`
  - others: `{ userId, role }`
