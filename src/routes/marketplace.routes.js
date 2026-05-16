const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const c = require('../controllers/marketplace.controller');

const router = Router();

router.get('/listings', c.listPublicListings);
router.get('/listings/:listingId', c.getListingById);
router.post('/listings/:listingId/inquiries', c.createInquiry);
router.post('/inquiries/:inquiryId/buyer-reply', c.buyerReplyInquiry);
router.get('/inquiries/:inquiryId/chat', c.getInquiryChat);
router.post('/listings/:listingId/buy', c.createPurchaseRequest);
router.post('/listings/:listingId/ratings', c.rateSeller);
router.get('/sellers/:sellerType/:sellerId/ratings', c.getSellerRatings);

router.post('/me/listings', authenticate('producer', 'processor'), c.createListing);
router.get('/me/listings', authenticate('producer', 'processor'), c.listMyListings);
router.patch('/me/listings/:listingId', authenticate('producer', 'processor'), c.updateMyListing);
router.get('/me/inquiries', authenticate('producer', 'processor'), c.listMyInquiries);
router.post('/me/inquiries/:inquiryId/reply', authenticate('producer', 'processor'), c.sellerReplyInquiry);
router.get('/me/notifications', authenticate('producer', 'processor'), c.listMyNotifications);
router.patch('/me/notifications/:notificationId/read', authenticate('producer', 'processor'), c.markNotificationRead);

module.exports = router;
