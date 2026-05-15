# Farmer API Documentation

This document covers all farmer-related APIs under the producer module.

Base path:

`/api/v1/producer`

Mounted in: [src/app.js](/c:/javaFiles/bgihackathon/bginewbackend/src/app.js:13)
Routes defined in: [src/routes/producer.routes.js](/c:/javaFiles/bgihackathon/bginewbackend/src/routes/producer.routes.js:1)
Controller logic in: [src/controllers/producer.controller.js](/c:/javaFiles/bgihackathon/bginewbackend/src/controllers/producer.controller.js:1)

## Overview

The farmer flow is implemented as part of the generic `producer` system.
A farmer is a producer with:

- `producerType = "farmer"`
- mandatory `geoLocation` during registration

Core capabilities:

1. Register farmer account
2. Login and get producer JWT
3. Fetch own profile
4. Create raw product entry
5. List own raw products
6. Get own raw product by `rawProductId`

## Authentication

Protected APIs require:

```http
Authorization: Bearer <jwt_token>
```

JWT payload contains:

- `userId`
- `role = "producer"`
- `producerType` (`farmer`, `wood_collector`, `dairy_meat_producer`)

## API List

### 1. Register Farmer (Producer Register)

```http
POST /api/v1/producer/register
```

Purpose:
Creates a producer account. For farmers, geo location is required.

Request body:

```json
{
  "name": "Ramesh Verma",
  "email": "ramesh@example.com",
  "password": "StrongPass@123",
  "producerType": "farmer",
  "geoLocation": { "lat": 22.7196, "lng": 75.8577 }
}
```

Validation rules:

- `name`, `email`, `password`, `producerType` are required
- if `producerType = farmer`, `geoLocation.lat` and `geoLocation.lng` must be numeric
- `email` must be unique

Success response (`201`):

```json
{
  "id": "6825c9c3f2d9dbe9b7331111",
  "isVerified": false
}
```

Possible errors:

- `400` missing fields
- `400` farmer geo location missing/invalid
- `409` email already exists

### 2. Login Farmer (Producer Login)

```http
POST /api/v1/producer/login
```

Purpose:
Authenticates producer credentials and returns JWT.

Request body:

```json
{
  "email": "ramesh@example.com",
  "password": "StrongPass@123"
}
```

Success response (`200`):

```json
{
  "token": "<jwt_token>"
}
```

Possible errors:

- `401` invalid credentials

### 3. Get My Profile

```http
GET /api/v1/producer/me
```

Auth: producer JWT required

Purpose:
Returns logged-in producer profile data (without password hash).

Success response (`200`):

```json
{
  "_id": "6825b7b2d8d7f44f1b5c9999",
  "name": "Ramesh Verma",
  "email": "ramesh@example.com",
  "producerType": "farmer",
  "geoLocation": { "lat": 22.7196, "lng": 75.8577 },
  "isVerified": true,
  "createdAt": "2026-05-15T10:00:00.000Z"
}
```

Possible errors:

- `401` unauthorized
- `404` producer not found

### 4. Add New Raw Product

```http
POST /api/v1/producer/products
```

Auth: producer JWT required + verified producer required

Purpose:
Creates a raw product record based on producer type payload.
For farmer users, body is stored under `farmFields`.

Important custom QR behavior:

- backend takes location from request (`geoLocation` or `farmLocation`)
- if missing, fallback to producer profile `geoLocation`
- reverse geocodes city from lat/lng
- maps city to MP region code via helper
- generates custom ID in format like `MP09-XXXXXXXXXX`
- returns that generated ID as `qrCodeText`

Farmer request example:

```json
{
  "cropName": "wheat",
  "quantity": 250,
  "quantityUnit": "kg",
  "geoLocation": { "lat": 22.7196, "lng": 75.8577 },
  "farmSizeAcres": 3.5,
  "pesticideUsed": false,
  "harvestDate": "2026-05-12T00:00:00.000Z",
  "organicCertified": true
}
```

Success response (`201`):

```json
{
  "qrCodeText": "MP09-AB12CD34EF"
}
```

Possible errors:

- `400` unsupported producer type
- `400` schema validation errors (including enum violations)
- `401` unauthorized
- `403` unverified producer

### 5. List My Raw Products

```http
GET /api/v1/producer/products
```

Auth: producer JWT required

Purpose:
Returns all raw products created by logged-in producer, sorted latest first.

Success response (`200`):

```json
[
  {
    "rawProductId": "MP09-AB12CD34EF",
    "producerType": "farmer",
    "farmFields": {
      "cropName": "wheat",
      "quantity": 250
    },
    "status": "available",
    "createdAt": "2026-05-15T10:00:00.000Z"
  }
]
```

Possible errors:

- `401` unauthorized

### 6. Get My Raw Product By ID

```http
GET /api/v1/producer/products/:rawProductId
```

Auth: producer JWT required

Purpose:
Returns one raw product only if it belongs to logged-in producer.

Success response (`200`):

```json
{
  "rawProductId": "MP09-AB12CD34EF",
  "producerType": "farmer",
  "farmFields": {
    "cropName": "wheat",
    "quantity": 250,
    "quantityUnit": "kg"
  },
  "status": "available",
  "createdAt": "2026-05-15T10:00:00.000Z"
}
```

Possible errors:

- `401` unauthorized
- `404` raw product not found

## Producer-Type Field Enums

Defined in: [src/models/RawProduct.js](/c:/javaFiles/bgihackathon/bginewbackend/src/models/RawProduct.js:1)

### Farmer `farmFields.cropName`

Allowed values:

- `wheat`
- `rice`
- `maize`
- `soybean`
- `cotton`
- `pulses`
- `vegetables`
- `fruits`
- `sugarcane`

### Wood Collector `woodFields.woodType`

Allowed values:

- `teak`
- `sal`
- `eucalyptus`
- `bamboo`
- `pine`
- `sandalwood`

### Dairy/Meat Producer `dairyMeatFields.productType`

Allowed values:

- `milk`
- `curd`
- `paneer`
- `cheese`
- `butter`
- `ghee`
- `chicken`
- `goat_meat`
- `eggs`

## Admin APIs Related To Farmer Verification

These are not under farmer auth but are part of farmer lifecycle:

1. `GET /api/v1/admin/producers/pending`
Lists unverified producers/farmers.

2. `PATCH /api/v1/admin/producers/:producerId/verify`
Marks producer/farmer as verified.

## Typical Farmer Flow

1. Register with `producerType = farmer` and geo location.
2. Login and get JWT.
3. Wait for admin verification.
4. Create raw product with farmer fields.
5. Receive `qrCodeText` like `MP09-...`.
6. Use list/get APIs to view own products and details.
