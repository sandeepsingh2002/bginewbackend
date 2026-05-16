# Producer (Farmer) & Processor API Documentation

This document covers all APIs for Producers (Farmers, Wood Collectors, Dairy/Meat Producers) and Processors in the supply chain system.

## Table of Contents

1. [Producer (Farmer) APIs](#producer-farmer-apis)
2. [Processor APIs](#processor-apis)
3. [Product Creation APIs (Quick Reference)](#product-creation-apis-quick-reference)

---

## Product Creation APIs (Quick Reference)

This section lists only the APIs that create products and exactly what they take/return from backend code.

### A) Producer Add Raw Product (v1)

```http
POST /api/v1/producer/products
```

Auth: producer JWT required + verified producer required

What backend uses:
- Reads `req.user.producerType`
- For ID generation, uses location in this order:
  1. `req.body.geoLocation` or `req.body.farmLocation`
  2. producer profile `geoLocation`
- Saves full request body into one of:
  - `farmFields` (if producerType = `farmer`)
  - `woodFields` (if producerType = `wood_collector`)
  - `dairyMeatFields` (if producerType = `dairy_meat_producer`)

Request body examples:

Farmer:
```json
{
  "cropName": "wheat",
  "quantity": 500,
  "quantityUnit": "kg",
  "geoLocation": { "lat": 22.7196, "lng": 75.8577 },
  "harvestDate": "2026-05-10"
}
```

Wood collector:
```json
{
  "woodType": "teak",
  "quantity": 200,
  "quantityUnit": "cubic feet",
  "geoLocation": { "lat": 22.5, "lng": 78.2 }
}
```

Dairy/meat producer:
```json
{
  "productType": "milk",
  "quantity": 100,
  "quantityUnit": "liters",
  "farmLocation": { "lat": 22.7, "lng": 75.9 }
}
```

Success (`201`):
```json
{
  "qrCodeText": "MP09-A1B2C3D4E5"
}
```

Errors:
- `400` unsupported producer type
- `401` unauthorized
- `403` producer not verified

Notes:
- This endpoint does not do strict request-body validation in controller; schema enums/rules apply at DB layer.
- Generated `qrCodeText` is stored as `rawProductId`.

### B) Processor Create Processed Product (v1)

```http
POST /api/v1/processor/products
```

Auth: processor JWT required

Request body:
```json
{
  "productName": "Whole Wheat Flour",
  "productCategory": "Food",
  "totalQuantityProduced": 450,
  "quantityUnit": "kg",
  "inputBatches": [
    { "batchId": "MP09-B1C2D3E4F5", "materialDescription": "Organic wheat" }
  ],
  "manufacturingDate": "2026-05-15",
  "expiryDate": "2026-11-15",
  "otherIngredients": ["salt"]
}
```

Backend checks:
- All `inputBatches[].batchId` must exist with:
  - same `processorId`
  - `status = closed`

Success (`201`):
```json
{
  "masterProductId": "MP09-M1N2O3P4Q5",
  "qrCodeUrl": "/qr/MP09-M1N2O3P4Q5.png"
}
```

Errors:
- `400` all input batches must be closed and belong to processor
- `401` unauthorized

### C) Processor Create New Product (v2 inventory flow)

```http
POST /api/v2/processor/products
```

Auth: processor JWT required

Request body:
```json
{
  "productName": "Premium Wheat Flour",
  "manufacturingDate": "2026-05-15T00:00:00.000Z",
  "expiryDate": "2026-11-15T00:00:00.000Z",
  "companyName": "Acme Foods Pvt Ltd",
  "quantityProduced": 900,
  "batchIds": ["BATCH_A1B2C3D4E5", "BATCH_F6G7H8I9J0"]
}
```

Also accepted:
- `productBatchQuantity` (used only if `quantityProduced` missing)

Backend checks:
- `productName`, `manufacturingDate`, `expiryDate` required
- `batchIds` must be a non-empty array
- output quantity must be positive number
- all selected batch IDs must currently be in processor inventory
- all selected batches must belong to processor and be `in_inventory`

Success (`201`):
```json
{
  "customQrText": "MP04-AB12CD34EF",
  "chainId": "MP04-AB12CD34EF",
  "productId": "6825c9c3f2d9dbe9b7339999",
  "usedBatchIds": ["BATCH_A1B2C3D4E5", "BATCH_F6G7H8I9J0"]
}
```

Errors:
- `400` validation/batch selection errors
- `401` unauthorized
- `404` inventory not found

---

## Producer (Farmer) APIs

Producers are the starting point of the supply chain. They can be farmers, wood collectors, or dairy/meat producers.

### Base URL
```
/api/v1/producer
```

### Authentication

All protected endpoints require JWT token:
```http
Authorization: Bearer <jwt_token>
```

---

### 1. Register Producer

```http
POST /api/v1/producer/register
```

Register a new producer (farmer, wood collector, or dairy/meat producer).

**Request Body:**
```json
{
  "name": "Ramesh Kumar",
  "email": "farmer@example.com",
  "password": "secure123",
  "producerType": "farmer",
  "geoLocation": {
    "lat": 22.7196,
    "lng": 75.8577
  }
}
```

**Fields:**
- `name` (string, required): Producer's full name
- `email` (string, required): Unique email address
- `password` (string, required): Password (min 6 characters)
- `producerType` (string, required): One of `farmer`, `wood_collector`, `dairy_meat_producer`
- `geoLocation` (object, required for farmers): Location with `lat` and `lng`

**Success Response (201):**
```json
{
  "id": "6825b7b2d8d7f44f1b5c1234",
  "isVerified": false
}
```

**Errors:**
- `400` Missing required fields or invalid geoLocation
- `409` Email already exists

**Note:** Farmers must be verified by admin before they can add products.

---

### 2. Login

```http
POST /api/v1/producer/login
```

Login and receive JWT token.

**Request Body:**
```json
{
  "email": "farmer@example.com",
  "password": "secure123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401` Invalid credentials

---

### 3. Get My Profile

```http
GET /api/v1/producer/me
```

Auth: producer JWT required

Get current producer's profile information.

**Success Response (200):**
```json
{
  "_id": "6825b7b2d8d7f44f1b5c1234",
  "name": "Ramesh Kumar",
  "email": "farmer@example.com",
  "producerType": "farmer",
  "geoLocation": {
    "lat": 22.7196,
    "lng": 75.8577
  },
  "isVerified": true,
  "verifiedAt": "2026-05-15T10:00:00.000Z",
  "createdAt": "2026-05-14T08:00:00.000Z"
}
```

**Errors:**
- `401` Unauthorized
- `404` Producer not found

---

### 4. Add Raw Product

```http
POST /api/v1/producer/products
```

Auth: producer JWT required (must be verified)

Add a new raw product to the system. The request body varies based on producer type.

#### For Farmers

**Request Body:**
```json
{
  "cropName": "wheat",
  "quantity": 500,
  "quantityUnit": "kg",
  "geoLocation": {
    "lat": 22.7196,
    "lng": 75.8577
  },
  "farmSizeAcres": 5,
  "pesticideUsed": false,
  "pesticideDetails": "",
  "harvestDate": "2026-05-10",
  "organicCertified": true
}
```

**Farmer Fields:**
- `cropName` (string, required): One of `wheat`, `rice`, `maize`, `soybean`, `cotton`, `pulses`, `vegetables`, `fruits`, `sugarcane`
- `quantity` (number, required): Quantity harvested
- `quantityUnit` (string, required): Unit like `kg`, `tons`, `quintals`
- `geoLocation` (object, optional): Farm location
- `farmSizeAcres` (number, optional): Farm size in acres
- `pesticideUsed` (boolean, optional): Whether pesticides were used
- `pesticideDetails` (string, optional): Details about pesticides
- `harvestDate` (date, optional): Date of harvest
- `organicCertified` (boolean, optional): Organic certification status

#### For Wood Collectors

**Request Body:**
```json
{
  "woodType": "teak",
  "quantity": 200,
  "quantityUnit": "cubic feet",
  "forestRegion": "Satpura Forest",
  "geoLocation": {
    "lat": 22.5,
    "lng": 78.2
  },
  "harvestDate": "2026-05-12",
  "sustainabilityCertified": true
}
```

**Wood Collector Fields:**
- `woodType` (string, required): One of `teak`, `sal`, `eucalyptus`, `bamboo`, `pine`, `sandalwood`
- `quantity` (number, required): Quantity collected
- `quantityUnit` (string, required): Unit like `cubic feet`, `tons`
- `forestRegion` (string, optional): Forest area name
- `geoLocation` (object, optional): Collection location
- `harvestDate` (date, optional): Collection date
- `sustainabilityCertified` (boolean, optional): Sustainability certification

#### For Dairy/Meat Producers

**Request Body:**
```json
{
  "productType": "milk",
  "animalBreed": "Holstein",
  "quantity": 100,
  "quantityUnit": "liters",
  "farmLocation": {
    "lat": 22.7,
    "lng": 75.9
  },
  "antibioticsUsed": false,
  "feedType": "organic grass",
  "collectionDate": "2026-05-15"
}
```

**Dairy/Meat Fields:**
- `productType` (string, required): One of `milk`, `curd`, `paneer`, `cheese`, `butter`, `ghee`, `chicken`, `goat_meat`, `eggs`
- `animalBreed` (string, optional): Breed of animal
- `quantity` (number, required): Quantity produced
- `quantityUnit` (string, required): Unit like `liters`, `kg`
- `farmLocation` (object, optional): Farm location
- `antibioticsUsed` (boolean, optional): Whether antibiotics were used
- `feedType` (string, optional): Type of feed given
- `collectionDate` (date, optional): Collection/production date

**Success Response (201):**
```json
{
  "qrCodeText": "MP09-A1B2C3D4E5"
}
```

The `qrCodeText` is the unique `rawProductId` that can be used for QR code generation and tracking.

**Errors:**
- `400` Invalid producer type or missing required fields
- `401` Unauthorized
- `403` Producer not verified by admin

---

### 5. List My Raw Products

```http
GET /api/v1/producer/products
```

Auth: producer JWT required

Get all raw products added by the authenticated producer.

**Success Response (200):**
```json
[
  {
    "_id": "6825c9c3f2d9dbe9b7331111",
    "rawProductId": "MP09-A1B2C3D4E5",
    "producerId": "6825b7b2d8d7f44f1b5c1234",
    "producerType": "farmer",
    "farmFields": {
      "cropName": "wheat",
      "quantity": 500,
      "quantityUnit": "kg",
      "geoLocation": {
        "lat": 22.7196,
        "lng": 75.8577
      },
      "farmSizeAcres": 5,
      "pesticideUsed": false,
      "harvestDate": "2026-05-10T00:00:00.000Z",
      "organicCertified": true
    },
    "qrCodeUrl": "/qr/MP09-A1B2C3D4E5.png",
    "status": "available",
    "createdAt": "2026-05-15T10:00:00.000Z"
  }
]
```

**Errors:**
- `401` Unauthorized

---

### 6. Get Raw Product by ID

```http
GET /api/v1/producer/products/:rawProductId
```

Auth: producer JWT required

Get details of a specific raw product owned by the authenticated producer.

**Path Parameters:**
- `rawProductId`: The raw product identifier (e.g., `MP09-A1B2C3D4E5`)

**Success Response (200):**
```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "rawProductId": "MP09-A1B2C3D4E5",
  "producerId": "6825b7b2d8d7f44f1b5c1234",
  "producerType": "farmer",
  "farmFields": {
    "cropName": "wheat",
    "quantity": 500,
    "quantityUnit": "kg",
    "organicCertified": true
  },
  "status": "in_batch",
  "createdAt": "2026-05-15T10:00:00.000Z"
}
```

**Status Values:**
- `available`: Product is available for processing
- `in_batch`: Product has been scanned into a processor batch

**Errors:**
- `401` Unauthorized
- `404` Raw product not found

---

## Processor APIs

Processors convert raw products into finished goods through a batch-based workflow.

### Base URL
```
/api/v1/processor
```

### Authentication

All protected endpoints require JWT token:
```http
Authorization: Bearer <jwt_token>
```

---

### 1. Register Processor

```http
POST /api/v1/processor/register
```

Register a new processor company.

**Request Body:**
```json
{
  "name": "John Processor",
  "email": "processor@example.com",
  "password": "secure123",
  "companyName": "ABC Food Processing Ltd",
  "geoLocation": {
    "lat": 22.7196,
    "lng": 75.8577
  }
}
```

**Fields:**
- `name` (string, required): Manager/owner name
- `email` (string, required): Unique email address
- `password` (string, required): Password (min 6 characters)
- `companyName` (string, required): Processing company name
- `geoLocation` (object, required): Processing facility location with `lat` and `lng`

**Success Response (201):**
```json
{
  "id": "6825b7b2d8d7f44f1b5c5678"
}
```

**Errors:**
- `400` Missing required fields or invalid geoLocation
- `409` Email already exists

---

### 2. Login

```http
POST /api/v1/processor/login
```

Login and receive JWT token.

**Request Body:**
```json
{
  "email": "processor@example.com",
  "password": "secure123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401` Invalid credentials

---

### 3. Create Batch

```http
POST /api/v1/processor/batches
```

Auth: processor JWT required

Create a new batch for collecting raw products. A batch is a container where you scan multiple raw products before processing.

**Request Body:** None

**Success Response (201):**
```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "batchId": "MP09-B1C2D3E4F5",
  "processorId": "6825b7b2d8d7f44f1b5c5678",
  "rawProductIds": [],
  "status": "open",
  "createdAt": "2026-05-15T11:00:00.000Z"
}
```

**Batch Status:**
- `open`: Batch is accepting raw products
- `closed`: Batch is finalized and ready for processing

**Errors:**
- `401` Unauthorized

---

### 4. Scan Raw Product into Batch

```http
POST /api/v1/processor/batches/:batchId/scan
```

Auth: processor JWT required

Scan a raw product into an open batch. The raw product must be in `available` status.

**Path Parameters:**
- `batchId`: The batch identifier (e.g., `MP09-B1C2D3E4F5`)

**Request Body:**
```json
{
  "rawProductId": "MP09-A1B2C3D4E5"
}
```

**Success Response (200):**
```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "batchId": "MP09-B1C2D3E4F5",
  "processorId": "6825b7b2d8d7f44f1b5c5678",
  "rawProductIds": ["MP09-A1B2C3D4E5"],
  "status": "open",
  "createdAt": "2026-05-15T11:00:00.000Z"
}
```

**Errors:**
- `401` Unauthorized
- `404` Open batch not found
- `409` Raw product unavailable or already scanned into this batch

---

### 5. Get Batch Details

```http
GET /api/v1/processor/batches/:batchId
```

Auth: processor JWT required

Get batch details including all scanned raw products.

**Path Parameters:**
- `batchId`: The batch identifier (e.g., `MP09-B1C2D3E4F5`)

**Success Response (200):**
```json
{
  "batch": {
    "_id": "6825c9c3f2d9dbe9b7331111",
    "batchId": "MP09-B1C2D3E4F5",
    "processorId": "6825b7b2d8d7f44f1b5c5678",
    "rawProductIds": ["MP09-A1B2C3D4E5", "MP09-Z9Y8X7W6V5"],
    "status": "open",
    "createdAt": "2026-05-15T11:00:00.000Z"
  },
  "rawProducts": [
    {
      "_id": "6825c9c3f2d9dbe9b7331111",
      "rawProductId": "MP09-A1B2C3D4E5",
      "producerType": "farmer",
      "farmFields": {
        "cropName": "wheat",
        "quantity": 500,
        "quantityUnit": "kg"
      },
      "status": "in_batch"
    }
  ]
}
```

**Errors:**
- `401` Unauthorized
- `404` Batch not found

---

### 6. Close Batch

```http
POST /api/v1/processor/batches/:batchId/close
```

Auth: processor JWT required

Close a batch to finalize it. Once closed, no more raw products can be added and the batch can be used to create processed products.

**Path Parameters:**
- `batchId`: The batch identifier (e.g., `MP09-B1C2D3E4F5`)

**Request Body:** None

**Success Response (200):**
```json
{
  "_id": "6825c9c3f2d9dbe9b7331111",
  "batchId": "MP09-B1C2D3E4F5",
  "processorId": "6825b7b2d8d7f44f1b5c5678",
  "rawProductIds": ["MP09-A1B2C3D4E5", "MP09-Z9Y8X7W6V5"],
  "status": "closed",
  "closedAt": "2026-05-15T12:00:00.000Z",
  "createdAt": "2026-05-15T11:00:00.000Z"
}
```

**Errors:**
- `401` Unauthorized
- `404` Open batch not found

---

### 7. Create Processed Product

```http
POST /api/v1/processor/products
```

Auth: processor JWT required

Create a finished processed product from closed batches. This generates a master product ID and QR code for supply chain tracking.

**Request Body:**
```json
{
  "productName": "Whole Wheat Flour",
  "productCategory": "Food",
  "totalQuantityProduced": 450,
  "quantityUnit": "kg",
  "inputBatches": [
    {
      "batchId": "MP09-B1C2D3E4F5",
      "materialDescription": "Organic wheat from local farms"
    }
  ],
  "manufacturingDate": "2026-05-15",
  "expiryDate": "2026-11-15",
  "otherIngredients": ["salt", "preservatives"]
}
```

**Fields:**
- `productName` (string, required): Name of the processed product
- `productCategory` (string, required): Category like `Food`, `Furniture`, `Dairy`
- `totalQuantityProduced` (number, required): Total quantity produced
- `quantityUnit` (string, required): Unit like `kg`, `liters`, `pieces`
- `inputBatches` (array, required): Array of batch objects with `batchId` and `materialDescription`
- `manufacturingDate` (date, optional): Manufacturing date
- `expiryDate` (date, optional): Expiry date
- `otherIngredients` (array, optional): Additional ingredients used

**Success Response (201):**
```json
{
  "masterProductId": "MP09-M1N2O3P4Q5",
  "qrCodeUrl": "/qr/MP09-M1N2O3P4Q5.png"
}
```

The `masterProductId` is the unique identifier for tracking this product through the entire supply chain.

**Errors:**
- `400` All input batches must be closed and belong to the processor
- `401` Unauthorized

---

### 8. List My Processed Products

```http
GET /api/v1/processor/products
```

Auth: processor JWT required

Get all processed products created by the authenticated processor.

**Success Response (200):**
```json
[
  {
    "_id": "6825c9c3f2d9dbe9b7339999",
    "masterProductId": "MP09-M1N2O3P4Q5",
    "processorId": "6825b7b2d8d7f44f1b5c5678",
    "productName": "Whole Wheat Flour",
    "productCategory": "Food",
    "totalQuantityProduced": 450,
    "quantityUnit": "kg",
    "inputBatches": [
      {
        "batchId": "MP09-B1C2D3E4F5",
        "materialDescription": "Organic wheat from local farms"
      }
    ],
    "manufacturingDate": "2026-05-15T00:00:00.000Z",
    "expiryDate": "2026-11-15T00:00:00.000Z",
    "otherIngredients": ["salt", "preservatives"],
    "qrCodeUrl": "/qr/MP09-M1N2O3P4Q5.png",
    "createdAt": "2026-05-15T12:30:00.000Z"
  }
]
```

**Errors:**
- `401` Unauthorized

---

## Typical Workflow

### Producer (Farmer) Workflow

1. **Register** as a farmer with location details
2. **Wait for admin verification**
3. **Login** to get JWT token
4. **Add raw products** after each harvest
5. **Track products** as they move into processor batches

### Processor Workflow

1. **Register** processing facility
2. **Login** to get JWT token
3. **Create a batch** to start collecting raw materials
4. **Scan raw products** into the batch (from farmers)
5. **Close the batch** when collection is complete
6. **Create processed product** using closed batches
7. **Generate QR code** for supply chain tracking

---

## ID Generation

All IDs are generated based on geographic location:

- **Format:** `CODE-RANDOMSTRING`
- **Example:** `MP09-A1B2C3D4E5`
- **CODE:** Based on city RTO code (e.g., MP09 for Indore)
- **RANDOMSTRING:** 10-character unique identifier

---

## Error Response Format

All errors follow this format:

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
- `403` Forbidden (not verified)
- `404` Not Found
- `409` Conflict (duplicate or unavailable resource)
- `500` Internal Server Error

---

## Related Files

- [Producer.js](src/models/Producer.js) - Producer model
- [RawProduct.js](src/models/RawProduct.js) - Raw product model
- [Processor.js](src/models/Processor.js) - Processor model
- [Batch.js](src/models/Batch.js) - Batch model
- [ProcessedProduct.js](src/models/ProcessedProduct.js) - Processed product model
- [producer.controller.js](src/controllers/producer.controller.js) - Producer API logic
- [processor.controller.js](src/controllers/processor.controller.js) - Processor API logic
- [producer.routes.js](src/routes/producer.routes.js) - Producer routes
- [processor.routes.js](src/routes/processor.routes.js) - Processor routes
