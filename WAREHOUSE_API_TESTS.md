# Warehouse API Test Examples

## Prerequisites
- Server running on http://localhost:5000
- MongoDB connected
- Distributor system operational

## 1. Register Warehouse

```bash
curl -X POST http://localhost:5000/api/v1/warehouse/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Warehouse Manager",
    "email": "warehouse@example.com",
    "password": "secure123",
    "warehouseName": "Central Cold Storage",
    "location": "123 Industrial Area, Indore",
    "geoLocation": {
      "lat": 22.7196,
      "lng": 75.8577
    }
  }'
```

Expected: `201 Created` with warehouse ID

## 2. Login

```bash
curl -X POST http://localhost:5000/api/v1/warehouse/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "warehouse@example.com",
    "password": "secure123"
  }'
```

Expected: `200 OK` with JWT token

Save the token for subsequent requests:
```bash
export TOKEN="your_jwt_token_here"
```

## 3. Scan Batch (Add to Inventory)

First, ensure you have a completed transport session ID from the distributor system.

```bash
curl -X POST http://localhost:5000/api/v1/warehouse/scan/TS-AB12CD34EF \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `201 Created` with batch details including `batchId`

Save the batchId:
```bash
export BATCH_ID="WB-A1B2C3D4E5"
```

## 4. Update Environmental Conditions (Hourly)

```bash
curl -X POST http://localhost:5000/api/v1/warehouse/environment/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 4.5,
    "humidity": 68
  }'
```

Expected: `200 OK` with confirmation

Repeat this every hour with current readings:

```bash
# Hour 2
curl -X POST http://localhost:5000/api/v1/warehouse/environment/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 4.3,
    "humidity": 67
  }'

# Hour 3
curl -X POST http://localhost:5000/api/v1/warehouse/environment/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 4.6,
    "humidity": 69
  }'
```

## 5. Get My Batches

```bash
curl -X GET http://localhost:5000/api/v1/warehouse/my-batches \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `200 OK` with array of all batches

## 6. Debit Batch (Out-Inventory)

```bash
curl -X POST http://localhost:5000/api/v1/warehouse/debit/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `200 OK` with `batchId` and `traceId`

## 7. Trace Batch (Public - No Auth Required)

```bash
curl -X GET http://localhost:5000/api/v1/warehouse/batch/$BATCH_ID
```

Expected: `200 OK` with complete batch history including:
- All environmental records
- Time in warehouse (hours)
- Scan and debit timestamps

## Complete Workflow Test

```bash
#!/bin/bash

# 1. Register
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/warehouse/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Warehouse",
    "email": "test@warehouse.com",
    "password": "test123",
    "warehouseName": "Test Storage",
    "location": "Test Location",
    "geoLocation": {"lat": 22.7196, "lng": 75.8577}
  }')

echo "Register: $REGISTER_RESPONSE"

# 2. Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/warehouse/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@warehouse.com",
    "password": "test123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 3. Scan batch (replace with actual sessionId)
SESSION_ID="TS-YOURSESSIONID"
SCAN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/warehouse/scan/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN")

BATCH_ID=$(echo $SCAN_RESPONSE | jq -r '.batchId')
echo "Batch ID: $BATCH_ID"

# 4. Add environmental record
ENV_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/warehouse/environment/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"temperature": 4.5, "humidity": 68}')

echo "Environment: $ENV_RESPONSE"

# 5. Get batches
BATCHES=$(curl -s -X GET http://localhost:5000/api/v1/warehouse/my-batches \
  -H "Authorization: Bearer $TOKEN")

echo "My Batches: $BATCHES"

# 6. Debit batch
DEBIT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/v1/warehouse/debit/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN")

echo "Debit: $DEBIT_RESPONSE"

# 7. Trace batch
TRACE_RESPONSE=$(curl -s -X GET http://localhost:5000/api/v1/warehouse/batch/$BATCH_ID)

echo "Trace: $TRACE_RESPONSE"
```

## Error Cases to Test

### 1. Scan non-existent session
```bash
curl -X POST http://localhost:5000/api/v1/warehouse/scan/INVALID-SESSION \
  -H "Authorization: Bearer $TOKEN"
```
Expected: `404 Not Found`

### 2. Scan incomplete session
```bash
curl -X POST http://localhost:5000/api/v1/warehouse/scan/TS-ACTIVE-SESSION \
  -H "Authorization: Bearer $TOKEN"
```
Expected: `400 Bad Request` - session must be completed

### 3. Duplicate scan
```bash
curl -X POST http://localhost:5000/api/v1/warehouse/scan/$SESSION_ID \
  -H "Authorization: Bearer $TOKEN"
```
Expected: `409 Conflict` - batch already scanned

### 4. Update environment for debited batch
```bash
# First debit the batch
curl -X POST http://localhost:5000/api/v1/warehouse/debit/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN"

# Then try to update environment
curl -X POST http://localhost:5000/api/v1/warehouse/environment/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"temperature": 4.5, "humidity": 68}'
```
Expected: `404 Not Found` - batch not in active inventory

### 5. Invalid humidity value
```bash
curl -X POST http://localhost:5000/api/v1/warehouse/environment/$BATCH_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"temperature": 4.5, "humidity": 150}'
```
Expected: `400 Bad Request` - humidity must be 0-100

### 6. Unauthorized access
```bash
curl -X POST http://localhost:5000/api/v1/warehouse/scan/TS-SESSION \
  -H "Authorization: Bearer INVALID_TOKEN"
```
Expected: `401 Unauthorized`

## Notes

- Replace `TS-AB12CD34EF` with actual completed session IDs
- Replace `WB-A1B2C3D4E5` with actual batch IDs
- Save tokens and IDs between requests
- Use `jq` for JSON parsing in bash scripts
- Test error cases to ensure proper validation
