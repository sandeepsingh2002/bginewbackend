const mongoose = require('mongoose');
const Producer = require('../models/Producer');
const Processor = require('../models/Processor');
const MarketplaceListing = require('../models/MarketplaceListing');
const MarketplaceInquiry = require('../models/MarketplaceInquiry');
const MarketplaceChatMessage = require('../models/MarketplaceChatMessage');
const MarketplacePurchase = require('../models/MarketplacePurchase');
const MarketplaceNotification = require('../models/MarketplaceNotification');
const MarketplaceRating = require('../models/MarketplaceRating');

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ''));

const getSellerProfile = async (role, userId) => {
  if (role === 'producer') {
    return Producer.findById(userId).select('name email producerType').lean();
  }
  if (role === 'processor') {
    return Processor.findById(userId).select('name email companyName').lean();
  }
  return null;
};

const createNotification = async ({ recipientType, recipientId, type, title, message, metadata }) => {
  await MarketplaceNotification.create({
    recipientType,
    recipientId,
    type,
    title,
    message,
    metadata
  });
};

const validatePriceRange = (priceMin, priceMax) => {
  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax)) return 'priceMin and priceMax must be numbers';
  if (priceMin < 0 || priceMax < 0) return 'priceMin and priceMax must be non-negative';
  if (priceMin > priceMax) return 'priceMin cannot be greater than priceMax';
  return null;
};

exports.createListing = async (req, res) => {
  try {
    const sellerType = req.user?.role;
    const sellerId = req.user?.userId;
    if (!['producer', 'processor'].includes(sellerType)) return res.status(403).json({ error: 'Forbidden' });
    if (!isObjectId(sellerId)) return res.status(400).json({ error: 'Invalid user id in token' });

    const {
      productName,
      description,
      imageUrl,
      priceMin,
      priceMax,
      currency,
      quantityAvailable,
      quantityUnit,
      productLocation,
      geoLocation,
      farmType
    } = req.body;

    if (!productName || !productLocation) {
      return res.status(400).json({ error: 'productName and productLocation are required' });
    }

    const priceErr = validatePriceRange(Number(priceMin), Number(priceMax));
    if (priceErr) return res.status(400).json({ error: priceErr });

    const seller = await getSellerProfile(sellerType, sellerId);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const listing = await MarketplaceListing.create({
      sellerType,
      sellerId,
      sellerSnapshot: {
        name: seller.name,
        email: seller.email,
        producerType: seller.producerType,
        companyName: seller.companyName
      },
      productName,
      description,
      imageUrl,
      priceMin: Number(priceMin),
      priceMax: Number(priceMax),
      currency: currency || 'INR',
      quantityAvailable: quantityAvailable !== undefined ? Number(quantityAvailable) : undefined,
      quantityUnit,
      productLocation,
      geoLocation,
      farmType
    });

    return res.status(201).json(listing);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create marketplace listing', details: err?.message });
  }
};

exports.listMyListings = async (req, res) => {
  try {
    const sellerType = req.user?.role;
    const sellerId = req.user?.userId;
    if (!['producer', 'processor'].includes(sellerType)) return res.status(403).json({ error: 'Forbidden' });
    const items = await MarketplaceListing.find({ sellerType, sellerId }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list seller listings', details: err?.message });
  }
};

exports.updateMyListing = async (req, res) => {
  try {
    const sellerType = req.user?.role;
    const sellerId = req.user?.userId;
    const { listingId } = req.params;
    const patch = { ...req.body };
    delete patch.sellerId;
    delete patch.sellerType;
    delete patch.sellerSnapshot;
    delete patch.viewCount;

    if (patch.priceMin !== undefined || patch.priceMax !== undefined) {
      const current = await MarketplaceListing.findOne({ _id: listingId, sellerType, sellerId }).lean();
      if (!current) return res.status(404).json({ error: 'Listing not found' });
      const nextMin = patch.priceMin !== undefined ? Number(patch.priceMin) : Number(current.priceMin);
      const nextMax = patch.priceMax !== undefined ? Number(patch.priceMax) : Number(current.priceMax);
      const priceErr = validatePriceRange(nextMin, nextMax);
      if (priceErr) return res.status(400).json({ error: priceErr });
      patch.priceMin = nextMin;
      patch.priceMax = nextMax;
    }

    const updated = await MarketplaceListing.findOneAndUpdate(
      { _id: listingId, sellerType, sellerId },
      { $set: patch },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Listing not found' });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update listing', details: err?.message });
  }
};

exports.listPublicListings = async (req, res) => {
  try {
    const { sellerType, farmType, location, q, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);

    const filter = { status: 'active' };
    if (sellerType && ['producer', 'processor'].includes(String(sellerType))) filter.sellerType = String(sellerType);
    if (farmType) filter.farmType = String(farmType);
    if (location) filter.productLocation = { $regex: String(location), $options: 'i' };
    if (q) filter.$or = [
      { productName: { $regex: String(q), $options: 'i' } },
      { description: { $regex: String(q), $options: 'i' } }
    ];

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.priceMin = {};
      if (minPrice !== undefined) filter.priceMin.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.priceMin.$lte = Number(maxPrice);
    }

    const [total, items] = await Promise.all([
      MarketplaceListing.countDocuments(filter),
      MarketplaceListing.find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
    ]);

    return res.json({
      page: safePage,
      limit: safeLimit,
      total,
      items
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list marketplace products', details: err?.message });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const listing = await MarketplaceListing.findOneAndUpdate(
      { _id: req.params.listingId, status: 'active' },
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const ratingSummary = await MarketplaceRating.aggregate([
      { $match: { sellerType: listing.sellerType, sellerId: listing.sellerId } },
      { $group: { _id: null, avgStars: { $avg: '$stars' }, count: { $sum: 1 } } }
    ]);

    const rating = ratingSummary[0] || { avgStars: 0, count: 0 };

    return res.json({
      ...listing.toObject(),
      sellerRating: {
        average: Number(rating.avgStars || 0).toFixed(2),
        count: rating.count || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch listing', details: err?.message });
  }
};

exports.createInquiry = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { buyerName, buyerContact, message, offeredPrice } = req.body;
    if (!buyerName || !buyerContact) {
      return res.status(400).json({ error: 'buyerName and buyerContact are required' });
    }

    const listing = await MarketplaceListing.findById(listingId).lean();
    if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Listing not found' });

    const inquiry = await MarketplaceInquiry.create({
      listingId: listing._id,
      sellerType: listing.sellerType,
      sellerId: listing.sellerId,
      buyerName,
      buyerContact,
      buyerMessage: message,
      offeredPrice: offeredPrice !== undefined ? Number(offeredPrice) : undefined
    });

    if (message) {
      await MarketplaceChatMessage.create({
        inquiryId: inquiry._id,
        senderType: 'buyer',
        senderRole: 'buyer',
        message
      });
    }

    await createNotification({
      recipientType: listing.sellerType,
      recipientId: listing.sellerId,
      type: 'BUYER_INTEREST',
      title: 'New buyer interest',
      message: `${buyerName} is interested in ${listing.productName}`,
      metadata: { listingId: listing._id, inquiryId: inquiry._id, offeredPrice: inquiry.offeredPrice }
    });

    return res.status(201).json(inquiry);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create inquiry', details: err?.message });
  }
};

exports.createPurchaseRequest = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { buyerName, buyerContact, quantity, quantityUnit, offeredPrice, note } = req.body;
    if (!buyerName || !buyerContact) {
      return res.status(400).json({ error: 'buyerName and buyerContact are required' });
    }
    const listing = await MarketplaceListing.findById(listingId).lean();
    if (!listing || listing.status !== 'active') return res.status(404).json({ error: 'Listing not found' });

    const purchase = await MarketplacePurchase.create({
      listingId: listing._id,
      sellerType: listing.sellerType,
      sellerId: listing.sellerId,
      buyerName,
      buyerContact,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      quantityUnit,
      offeredPrice: offeredPrice !== undefined ? Number(offeredPrice) : undefined,
      note
    });

    await createNotification({
      recipientType: listing.sellerType,
      recipientId: listing.sellerId,
      type: 'PURCHASE_REQUEST',
      title: 'New purchase request',
      message: `${buyerName} placed a purchase request for ${listing.productName}`,
      metadata: { listingId: listing._id, purchaseId: purchase._id, offeredPrice: purchase.offeredPrice }
    });

    return res.status(201).json(purchase);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create purchase request', details: err?.message });
  }
};

exports.listMyInquiries = async (req, res) => {
  try {
    const sellerType = req.user?.role;
    const sellerId = req.user?.userId;
    const items = await MarketplaceInquiry.find({ sellerType, sellerId }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list inquiries', details: err?.message });
  }
};

exports.sellerReplyInquiry = async (req, res) => {
  try {
    const sellerType = req.user?.role;
    const sellerId = req.user?.userId;
    const { inquiryId } = req.params;
    const { message, status } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const inquiry = await MarketplaceInquiry.findOne({ _id: inquiryId, sellerType, sellerId });
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (status && ['open', 'accepted', 'rejected', 'closed'].includes(status)) inquiry.status = status;
    inquiry.unreadForSeller = false;
    await inquiry.save();

    const chat = await MarketplaceChatMessage.create({
      inquiryId: inquiry._id,
      senderType: 'seller',
      senderRole: sellerType,
      senderId: sellerId,
      message
    });

    return res.status(201).json(chat);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reply to inquiry', details: err?.message });
  }
};

exports.buyerReplyInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { buyerContact, message } = req.body;
    if (!buyerContact || !message) return res.status(400).json({ error: 'buyerContact and message are required' });

    const inquiry = await MarketplaceInquiry.findById(inquiryId);
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (String(inquiry.buyerContact) !== String(buyerContact)) {
      return res.status(403).json({ error: 'Buyer contact does not match inquiry owner' });
    }

    const chat = await MarketplaceChatMessage.create({
      inquiryId: inquiry._id,
      senderType: 'buyer',
      senderRole: 'buyer',
      message
    });

    inquiry.unreadForSeller = true;
    await inquiry.save();

    await createNotification({
      recipientType: inquiry.sellerType,
      recipientId: inquiry.sellerId,
      type: 'BUYER_CHAT_MESSAGE',
      title: 'New buyer message',
      message: `New chat message from ${inquiry.buyerName}`,
      metadata: { inquiryId: inquiry._id, listingId: inquiry.listingId }
    });

    return res.status(201).json(chat);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to post buyer message', details: err?.message });
  }
};

exports.getInquiryChat = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const inquiry = await MarketplaceInquiry.findById(inquiryId).lean();
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });

    const isSeller = req.user && req.user.role === inquiry.sellerType && String(req.user.userId) === String(inquiry.sellerId);
    const isBuyer = req.query.buyerContact && String(req.query.buyerContact) === String(inquiry.buyerContact);
    if (!isSeller && !isBuyer) return res.status(403).json({ error: 'Forbidden' });

    const messages = await MarketplaceChatMessage.find({ inquiryId: inquiry._id }).sort({ createdAt: 1 });
    return res.json({ inquiry, messages });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch inquiry chat', details: err?.message });
  }
};

exports.listMyNotifications = async (req, res) => {
  try {
    const recipientType = req.user?.role;
    const recipientId = req.user?.userId;
    const items = await MarketplaceNotification.find({ recipientType, recipientId }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list notifications', details: err?.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const recipientType = req.user?.role;
    const recipientId = req.user?.userId;
    const item = await MarketplaceNotification.findOneAndUpdate(
      { _id: req.params.notificationId, recipientType, recipientId },
      { isRead: true },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Notification not found' });
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification', details: err?.message });
  }
};

exports.rateSeller = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { buyerName, buyerContact, stars, review } = req.body;
    if (!buyerName || !buyerContact || !Number.isFinite(Number(stars))) {
      return res.status(400).json({ error: 'buyerName, buyerContact and stars are required' });
    }
    const safeStars = Number(stars);
    if (safeStars < 1 || safeStars > 5) return res.status(400).json({ error: 'stars must be between 1 and 5' });

    const listing = await MarketplaceListing.findById(listingId).lean();
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const rating = await MarketplaceRating.create({
      sellerType: listing.sellerType,
      sellerId: listing.sellerId,
      listingId: listing._id,
      buyerName,
      buyerContact,
      stars: safeStars,
      review
    });

    return res.status(201).json(rating);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit rating', details: err?.message });
  }
};

exports.getSellerRatings = async (req, res) => {
  try {
    const { sellerType, sellerId } = req.params;
    if (!['producer', 'processor'].includes(sellerType)) return res.status(400).json({ error: 'Invalid sellerType' });
    if (!isObjectId(sellerId)) return res.status(400).json({ error: 'Invalid sellerId' });

    const [summary, recent] = await Promise.all([
      MarketplaceRating.aggregate([
        { $match: { sellerType, sellerId: new mongoose.Types.ObjectId(sellerId) } },
        { $group: { _id: null, avgStars: { $avg: '$stars' }, totalRatings: { $sum: 1 } } }
      ]),
      MarketplaceRating.find({ sellerType, sellerId }).sort({ createdAt: -1 }).limit(20)
    ]);

    const agg = summary[0] || { avgStars: 0, totalRatings: 0 };
    return res.json({
      sellerType,
      sellerId,
      averageStars: Number(agg.avgStars || 0).toFixed(2),
      totalRatings: agg.totalRatings || 0,
      recentRatings: recent
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch ratings', details: err?.message });
  }
};
