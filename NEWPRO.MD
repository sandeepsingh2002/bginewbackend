# Processor V2 API Documentation

This document covers the new processor-only v2 APIs.

Base path:

`/api/v2/processor`

Mounted in: [src/app.js](/c:/javaFiles/bgihackathon/bginewbackend/src/app.js:15)  
Routes defined in: [src/routes/processorV2.routes.js](/c:/javaFiles/bgihackathon/bginewbackend/src/routes/processorV2.routes.js:1)  
Controller logic in: [src/controllers/processorV2.controller.js](/c:/javaFiles/bgihackathon/bginewbackend/src/controllers/processorV2.controller.js:1)

## Overview

Processor v2 is inventory-driven.

- Processor registers with company details and location.
- Processor creates batches (each batch has one raw product type).
- Batches are automatically added to processor inventory.
- Raw products are scanned into a batch only if type matches.
- Batch total weight is updated from scanned raw quantity.
- Processor creates a final product using one or more inventory batches.
- Used batches are removed from inventory and marked consumed.
- System creates a custom QR text and chain record for traceability.

## Authentication

Protected APIs require:

```http
Authorization: Bearer <jwt_token>
```

JWT role: `processor`

## API List

### 1. Register Processor

```http
POST /api/v2/processor/register
```

Request body:

```json
{
  "companyName": "Acme Foods Pvt Ltd",
  "email": "ops@acmefoods.com",
  "gstinNumber": "23ABCDE1234F1Z9",
  "password": "StrongPass@123",
  "currentLocation": { "lat": 22.7196, "lng": 75.8577 }
}
```

Success (`201`):

```json
{
  "id": "6825c9c3f2d9dbe9b7331111",
  "companyName": "Acme Foods Pvt Ltd",
  "isVerified": false
}
```

Notes:
- Creates processor record.
- Creates empty inventory for processor.

### 2. Login Processor

```http
POST /api/v2/processor/login
```

Request body:

```json
{
  "email": "ops@acmefoods.com",
  "password": "StrongPass@123"
}
```

Success (`200`):

```json
{
  "token": "<jwt_token>"
}
```

### 3. Get Inventory

```http
GET /api/v2/processor/inventory
```

Auth: required

Success (`200`):

```json
{
  "inventoryId": "6825c9c3f2d9dbe9b733abcd",
  "processorId": "6825c9c3f2d9dbe9b7331111",
  "totalBatches": 2,
  "batchIds": ["MP04-AA11BB22CC", "MP04-DD33EE44FF"],
  "batches": []
}
```

### 4. Add Existing Batch To Inventory

```http
POST /api/v2/processor/inventory/batches/:batchId
```

Auth: required

Use case:
- Re-add a removed (not consumed) batch.

### 5. List Batches Inside Inventory

```http
GET /api/v2/processor/inventory/batches
```

Auth: required

Returns only batches that are currently present in inventory.

### 6. Remove Batch From Inventory

```http
DELETE /api/v2/processor/inventory/batches/:batchId
```

Auth: required

Success (`200`) marks batch as `removed`.

### 7. List All Processor Batches

```http
GET /api/v2/processor/batches
```

Auth: required

Returns all processor batches (inventory + consumed + removed).

### 8. Create Batch

```http
POST /api/v2/processor/batches
```

Auth: required

Request body:

```json
{
  "batchName": "Wheat Batch May A",
  "productType": "wheat"
}
```

Behavior:
- Generates `batchId` using processor location (MP04 fallback).
- Initializes:
  - `totalWeight = 0`
  - `rawProductIds = []`
  - `status = in_inventory`
- Auto-adds batch to inventory.

Success (`201`) returns created batch document.

Common errors:
- `400` when `batchName` or `productType` is missing
- `400` when token processor id is malformed
- `404` when processor does not exist
- `409` on rare generated `batchId` conflict

`productType` can be any non-empty string.
Type compatibility is validated later during scan:
- raw producer type value must match this batch `productType`.

### 9. Scan Raw Product Into Batch

```http
POST /api/v2/processor/batches/:batchId/scan
```

Auth: required

Request body:

```json
{
  "productString": "MP09-AB12CD34EF"
}
```

How it works:
- Finds target batch in inventory.
- Finds raw product with `rawProductId = productString` and `status = available`.
- Reads raw type from producer payload:
  - farmer -> `farmFields.cropName`
  - wood_collector -> `woodFields.woodType`
  - dairy_meat_producer -> `dairyMeatFields.productType`
- Compares with batch `productType`.
- If match:
  - push rawProductId into batch array
  - add raw quantity to batch `totalWeight`
  - set raw product status to `in_batch`

Success (`200`) includes updated weight summary.

### 10. Create New End Product (Consumes Inventory Batches)

```http
POST /api/v2/processor/products
```

Auth: required

Request body:

```json
{
  "productName": "Premium Wheat Flour",
  "manufacturingDate": "2026-05-15T00:00:00.000Z",
  "expiryDate": "2026-11-15T00:00:00.000Z",
  "companyName": "Acme Foods Pvt Ltd",
  "quantityProduced": 900,
  "batchIds": ["MP04-AA11BB22CC", "MP04-DD33EE44FF"]
}
```

Behavior:
- Validates all provided batches exist in processor inventory.
- Generates new custom QR text using processor location (MP04 fallback).
- Creates processed product record.
- Creates chain record with QR text as chain id.
- Removes used batches from inventory.
- Marks used batches as `consumed`.

Success (`201`):

```json
{
  "customQrText": "MP04-AB12CD34EF",
  "chainId": "MP04-AB12CD34EF",
  "productId": "6825c9c3f2d9dbe9b7339999",
  "usedBatchIds": ["MP04-AA11BB22CC", "MP04-DD33EE44FF"]
}
```

Request note:
- `quantityProduced` and `productBatchQuantity` are both accepted.
- Service uses `quantityProduced` first; if missing, it falls back to `productBatchQuantity`.

### 11. List Processor Products

```http
GET /api/v2/processor/products
```

Auth: required

Returns processor-created end products.

### 12. Get Chain Details By Custom QR Text

```http
GET /api/v2/processor/chain/:customQrText
```

Public endpoint (no auth currently).

Returns:
- Product details
- Processor company details
- Batch-level traceability
- Raw products used
- Backtracking summary to producers/farmers totals

Example totals block:

```json
{
  "totals": {
    "totalBatches": 2,
    "totalRawProducts": 8,
    "totalProducers": 6,
    "totalFarmers": 4
  }
}
```

## Data Models (V2)

1. Processor (updated)
- Added `gstinNumber`
- Added `currentLocation`

2. ProcessorInventory
- One per processor
- `batchIds[]` points to active inventory batches

3. ProcessorBatch
- `batchId`, `batchName`, `productType`, `totalWeight`
- `rawProductIds[]`
- `status`: `in_inventory | consumed | removed`

4. ProcessedProductV2
- `customQrText`
- product details and output quantity
- source `batchIds[]`

5. Chain
- `chainId = customQrText`
- links processor + processed product + batch ids

## End-To-End Flow

1. Register processor (`companyName, email, gstinNumber, password, currentLocation`).
2. Login and get processor JWT.
3. Create one or more batches with `batchName + productType`.
4. Each batch auto-enters inventory with zero weight.
5. Scan producer raw product QR strings into a selected batch.
6. System validates type match and adds quantity to batch weight.
7. Create final product using one or more batch ids from inventory.
8. System consumes those batches and removes them from inventory.
9. System generates custom QR text and chain record.
10. Use chain endpoint with QR text to see full processor-to-farmer traceability.

## Current Notes

- Existing v1 processor APIs remain available at `/api/v1/processor`.
- New design is isolated under `/api/v2/processor`.
- Chain lookup endpoint is currently public in route config.
