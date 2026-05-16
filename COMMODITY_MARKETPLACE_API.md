# Commodity Marketplace API Documentation

This module allows producers and processors to list commodity products, and buyers to browse, negotiate, chat, and place purchase requests.

## Base Paths

- Seller convenience routes:
  - `/api/v1/producer/marketplace/products`
  - `/api/v1/processor/marketplace/products`
- Full marketplace module:
  - `/api/v1/marketplace`

## Authentication

- Seller routes require JWT:
```http
Authorization: Bearer <jwt_token>
```
- Buyer actions are public and use buyer details in request body.

---

## 1) Create Marketplace Listing (Producer/Processor)

### Producer route
```http
POST /api/v1/producer/marketplace/products
```

### Processor route
```http
POST /api/v1/processor/marketplace/products
```

### Shared route
```http
POST /api/v1/marketplace/me/listings
```

Request body:
```json
{
  "productName": "Organic Wheat",
  "description": "Fresh harvest commodity",
  "imageUrl": "https://example.com/wheat.jpg",
  "priceMin": 2200,
  "priceMax": 2600,
  "currency": "INR",
  "quantityAvailable": 5000,
  "quantityUnit": "kg",
  "productLocation": "Indore, MP",
  "geoLocation": { "lat": 22.7196, "lng": 75.8577 },
  "farmType": "organic"
}
```

Required fields:
- `productName`
- `priceMin` (number)
- `priceMax` (number, must be >= `priceMin`)
- `productLocation`

Success (`201`): returns full created listing document.

---

## 2) List Public Marketplace Products

```http
GET /api/v1/marketplace/listings
```

Query params (optional):
- `sellerType=producer|processor`
- `farmType=<value>`
- `location=<text>`
- `q=<search text>`
- `minPrice=<number>`
- `maxPrice=<number>`
- `page=<number>`
- `limit=<number>`

Success (`200`):
```json
{
  "page": 1,
  "limit": 20,
  "total": 1,
  "items": []
}
```

---

## 3) View Listing Details (increments view count)

```http
GET /api/v1/marketplace/listings/:listingId
```

Behavior:
- increments `viewCount` by 1
- includes seller rating summary

Success (`200`): listing object + `sellerRating`.

---

## 4) Seller: List/Update Own Listings

```http
GET /api/v1/marketplace/me/listings
PATCH /api/v1/marketplace/me/listings/:listingId
```

Patch body supports editable listing fields like:
- `productName`, `description`, `imageUrl`
- `priceMin`, `priceMax`
- `quantityAvailable`, `quantityUnit`
- `productLocation`, `geoLocation`, `farmType`
- `status` (`active`, `paused`, `sold`)

---

## 5) Buyer Interest / Price Negotiation Request

```http
POST /api/v1/marketplace/listings/:listingId/inquiries
```

Request body:
```json
{
  "buyerName": "Amit Traders",
  "buyerContact": "+91-9999999999",
  "message": "Can you offer 2350 per quintal?",
  "offeredPrice": 2350
}
```

Behavior:
- creates inquiry thread
- optional first buyer chat message
- creates seller notification (`BUYER_INTEREST`)

Success (`201`): inquiry object.

---

## 6) Chat Between Buyer and Seller

### Buyer reply
```http
POST /api/v1/marketplace/inquiries/:inquiryId/buyer-reply
```

Body:
```json
{
  "buyerContact": "+91-9999999999",
  "message": "Please share transport timeline."
}
```

### Seller reply
```http
POST /api/v1/marketplace/me/inquiries/:inquiryId/reply
```

Body:
```json
{
  "message": "We can dispatch in 2 days.",
  "status": "open"
}
```

### Fetch chat
```http
GET /api/v1/marketplace/inquiries/:inquiryId/chat?buyerContact=+91-9999999999
```

Notes:
- Seller can fetch with JWT.
- Buyer can fetch using matching `buyerContact`.

---

## 7) Buyer Purchase Request

```http
POST /api/v1/marketplace/listings/:listingId/buy
```

Body:
```json
{
  "buyerName": "Amit Traders",
  "buyerContact": "+91-9999999999",
  "quantity": 1000,
  "quantityUnit": "kg",
  "offeredPrice": 2400,
  "note": "Need delivery by next week"
}
```

Behavior:
- creates purchase request with status `requested`
- creates seller notification (`PURCHASE_REQUEST`)

Success (`201`): purchase request object.

---

## 8) Seller Inquiries and Notifications

```http
GET /api/v1/marketplace/me/inquiries
GET /api/v1/marketplace/me/notifications
PATCH /api/v1/marketplace/me/notifications/:notificationId/read
```

---

## 9) Star Rating for Seller

### Submit rating for listing seller
```http
POST /api/v1/marketplace/listings/:listingId/ratings
```

Body:
```json
{
  "buyerName": "Amit Traders",
  "buyerContact": "+91-9999999999",
  "stars": 5,
  "review": "Good quality and fair pricing"
}
```

### Get seller ratings
```http
GET /api/v1/marketplace/sellers/:sellerType/:sellerId/ratings
```

Returns:
- `averageStars`
- `totalRatings`
- latest 20 ratings

---

## Error Format

Most errors follow:
```json
{
  "error": "Error message",
  "details": "Optional details"
}
```

Common statuses:
- `201` Created
- `200` Success
- `400` Validation error
- `401` Unauthorized
- `403` Forbidden
- `404` Not found
- `500` Internal error

---

## Implemented Files

- `src/models/MarketplaceListing.js`
- `src/models/MarketplaceInquiry.js`
- `src/models/MarketplaceChatMessage.js`
- `src/models/MarketplacePurchase.js`
- `src/models/MarketplaceNotification.js`
- `src/models/MarketplaceRating.js`
- `src/controllers/marketplace.controller.js`
- `src/routes/marketplace.routes.js`
- `src/app.js` (route mounted)
- `src/routes/producer.routes.js` (producer convenience create route)
- `src/routes/processor.routes.js` (processor convenience create route)
