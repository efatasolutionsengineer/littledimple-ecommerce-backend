const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportsController');
const adminCheck = require('../middleware/adminCheck');

router.use(authMiddleware);
router.use(adminCheck);

// Sales & Revenue Reports
router.get('/total-revenue', reportController.totalRevenue);
router.get('/total-orders', reportController.totalOrders);
router.get('/this-month-orders', reportController.thisMonthOrders);
router.get('/average-order-value', reportController.averageOrderValue);
router.get('/revenue-per-day', reportController.revenuePerDay);

// User & Customer Reports
router.get('/new-customers', reportController.newCustomers);
router.get('/active-customers', reportController.activeCustomers);

// Product & Inventory Reports
router.get('/product-sales', reportController.productSales);
router.get('/low-stock', reportController.lowStockProducts);
router.get('/out-of-stock', reportController.outOfStockProducts);
router.get('/top-selling', reportController.topSellingProducts);
router.get('/popular-products-by-cart', reportController.popularProductsByCart);
router.get('/popular-products-by-reviews', reportController.popularProductsByReviews);

// Voucher & Coupon Reports
router.get('/coupon-usage', reportController.couponUsage);
router.get('/voucher-usage', reportController.voucherUsage);

// Shipping & Delivery Reports
router.get('/shipping-usage', reportController.shippingUsage);
router.get('/average-delivery-time', reportController.averageDeliveryTime);
router.get('/delivery-status', reportController.deliveryStatus);

// Operational & Performance
router.get('/fulfillment-rate', reportController.fulfillmentRate);
router.get('/refund-requests', reportController.refundRequests);
router.get('/return-rate', reportController.returnRate);

// Content Performance
router.get('/page-views', reportController.pageViews);
router.get('/product-views', reportController.productViews);
router.get('/top-articles', reportController.topArticles);
router.get('/blog-views', reportController.blogViews);
router.get('/blog-comments', reportController.blogComments);
router.get('/engagement-rate', reportController.engagementRate);

module.exports = router;
