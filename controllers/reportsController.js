const knex = require('../db/knex');

module.exports = {
    // === SALES & REVENUE REPORTS ===
    /**
     * @swagger
     * /api/reports/total-revenue:
     *   get:
     *     summary: Get total revenue OR Web Orders in Rupiah
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Total revenue fetched successfully
     *       500:
     *         description: Server error
     */
    totalRevenue: async (req, res) => {
        try {
        const result = await knex('orders').whereNotNull('payment_transaction_id').whereNull('deleted_at').sum('total_price as total');
        res.json({ totalRevenue: result[0].total || 0 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/total-orders:
     *   get:
     *     summary: Get total number of orders OR Web Orders
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Total orders fetched successfully
     *       500:
     *         description: Server error
     */
    totalOrders: async (req, res) => {
        try {
        const result = await knex('orders').whereNull('deleted_at').count('id as total');
        res.json({ totalOrders: result[0].total || 0 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/this-month-orders:
     *   get:
     *     summary: Get total number of orders for current month OR This Month Order
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: This month orders fetched successfully
     *       500:
     *         description: Server error
     */
    thisMonthOrders: async (req, res) => {
        try {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            
            // Calculate start and end of current month
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

            const result = await knex('orders')
                .whereNull('deleted_at')
                .whereBetween('order_date', [startDate, endDate])
                .count('id as total');

            res.json({ thisMonthOrders: result[0].total || 0 });
            
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/average-order-value:
     *   get:
     *     summary: Get average order value
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Average order value fetched successfully
     *       500:
     *         description: Server error
     */
    averageOrderValue: async (req, res) => {
        try {
        const result = await knex('orders').avg('total_price as average');
        res.json({ averageOrderValue: result[0].average || 0 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/revenue-per-day:
     *   get:
     *     summary: Get revenue per day
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Revenue per day fetched successfully
     *       500:
     *         description: Server error
     */
    revenuePerDay: async (req, res) => {
        try {
        const result = await knex('orders')
            .select(knex.raw("DATE(created_at) as date"))
            .sum('total_price as total')
            .groupByRaw('DATE(created_at)')
            .orderBy('date', 'asc');

        res.json({ revenuePerDay: result });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    // === USER & CUSTOMER REPORTS ===
    /**
     * @swagger
     * /api/reports/new-customers:
     *   get:
     *     summary: Get number of new customers in last 30 days
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: New customers fetched successfully
     *       500:
     *         description: Server error
     */
    newCustomers: async (req, res) => {
        try {
        const result = await knex('users')
            .where('created_at', '>=', knex.raw("NOW() - INTERVAL '30 days'"))
            .count('id as total');
        res.json({ newCustomers: result[0].total || 0 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/active-customers:
     *   get:
     *     summary: Get number of active customers
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Active customers fetched successfully
     *       500:
     *         description: Server error
     */
    activeCustomers: async (req, res) => {
        try {
        const result = await knex('orders')
            .distinct('user_id')
            .count('user_id as total');
        res.json({ activeCustomers: result.length });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    // === PRODUCT & INVENTORY REPORTS ===
    /**
     * @swagger
     * /api/reports/product-sales:
     *   get:
     *     summary: Get product sales data
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Product sales fetched successfully
     *       500:
     *         description: Server error
     */
    productSales: async (req, res) => {
        try {
        const result = await knex('order_details')
            .select('product_id')
            .sum('quantity as total_sold')
            .groupBy('product_id');
        res.json({ productSales: result });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/low-stock-products:
     *   get:
     *     summary: Get products with low stock
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Low stock products fetched successfully
     *       500:
     *         description: Server error
     */
    lowStockProducts: async (req, res) => {
        try {
        const result = await knex('products').where('stock', '<', 10);
        res.json({ lowStockProducts: result });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/out-of-stock-products:
     *   get:
     *     summary: Get out of stock products
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Out of stock products fetched successfully
     *       500:
     *         description: Server error
     */
    outOfStockProducts: async (req, res) => {
        try {
        const result = await knex('products').where('stock', 0);
        res.json({ outOfStockProducts: result });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/top-selling-products:
     *   get:
     *     summary: Get top 10 selling products OR Popular product by total order
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Top selling products fetched successfully
     *       500:
     *         description: Server error
     */
    topSellingProducts: async (req, res) => {
        try {
        const result = await knex('order_details')
            .select('product_id')
            .sum('quantity as total_sold')
            .whereNull('deleted_at')
            .groupBy('product_id')
            .orderBy('total_sold', 'desc')
            .limit(10);
        res.json({ topSellingProducts: result });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/popular-products-by-cart:
     *   get:
     *     summary: Get popular products by cart count
     *     tags: [Reports]
     *     parameters:
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *           minimum: 1
     *           maximum: 100
     *         description: Number of products to return
     *         example: 10
     *     responses:
     *       200:
     *         description: Popular products by cart fetched successfully
     *       500:
     *         description: Server error
     */
    popularProductsByCart: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            
            const result = await knex('cart as c')
                .select('p.name')
                .count('c.id as cart_count')
                .innerJoin('products as p', 'p.id', 'c.product_id')
                .whereNull('c.deleted_at')
                .groupBy('p.id', 'p.name')
                .orderBy('cart_count', 'desc')
                .limit(limit);

            res.json({ popularProductsByCart: result });
            
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/popular-products-by-reviews:
     *   get:
     *     summary: Get popular products by review count
     *     tags: [Reports]
     *     parameters:
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *           minimum: 1
     *           maximum: 100
     *         description: Number of products to return
     *         example: 10
     *     responses:
     *       200:
     *         description: Popular products by reviews fetched successfully
     *       500:
     *         description: Server error
     */
    popularProductsByReviews: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            
            const result = await knex('reviews as r')
                .select('p.name')
                .count('r.id as review_count')
                .innerJoin('products as p', 'p.id', 'r.product_id')
                .whereNull('r.deleted_at')
                .groupBy('p.id', 'p.name')
                .orderBy('review_count', 'desc')
                .limit(limit);

            res.json({ popularProductsByReviews: result });
            
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // === VOUCHER & COUPON REPORTS ===
    /**
     * @swagger
     * /api/reports/coupon-usage:
     *   get:
     *     summary: Get coupon usage count
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Coupon usage fetched successfully
     *       500:
     *         description: Server error
     */
    couponUsage: async (req, res) => {
        try {
        const result = await knex('orders')
            .whereNotNull('coupon_code')
            .count('id as total');
        res.json({ couponUsage: result[0].total || 0 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/voucher-usage:
     *   get:
     *     summary: Get voucher usage count
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Voucher usage fetched successfully
     *       500:
     *         description: Server error
     */
    voucherUsage: async (req, res) => {
        try {
        const result = await knex('orders')
            .whereNotNull('voucher_id')
            .count('id as total');
        res.json({ voucherUsage: result[0].total || 0 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    // === SHIPPING & DELIVERY REPORTS ===
    /**
     * @swagger
     * /api/reports/shipping-usage:
     *   get:
     *     summary: Get shipping service usage data
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Shipping usage fetched successfully
     *       500:
     *         description: Server error
     */
    shippingUsage: async (req, res) => {
        try {
        const result = await knex('orders')
            .select('shipping_service')
            .count('id as total')
            .groupBy('shipping_service');
        res.json({ shippingUsage: result });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/average-delivery-time:
     *   get:
     *     summary: Get average delivery time in hours
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Average delivery time fetched successfully
     *       500:
     *         description: Server error
     */
    averageDeliveryTime: async (req, res) => {
        try {
        const result = await knex('orders')
            .whereNotNull('delivered_at')
            .avg(knex.raw('EXTRACT(EPOCH FROM (delivered_at - created_at)) / 3600 as avg_hours'));
        res.json({ averageDeliveryTime: result[0].avg_hours || 0 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/delivery-status:
     *   get:
     *     summary: Get delivery status breakdown
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Delivery status fetched successfully
     *       500:
     *         description: Server error
     */
    deliveryStatus: async (req, res) => {
        try {
        const result = await knex('orders')
            .select('delivery_status')
            .count('id as total')
            .groupBy('delivery_status');
        res.json({ deliveryStatus: result });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    // === OPERATIONAL & PERFORMANCE ===
    // /**
    //  * @swagger
    //  * /api/reports/fulfillment-rate:
    //  *   get:
    //  *     summary: Get order fulfillment rate
    //  *     tags: [Reports]
    //  *     responses:
    //  *       200:
    //  *         description: Fulfillment rate fetched successfully
    //  *       500:
    //  *         description: Server error
    //  */
    // fulfillmentRate: async (req, res) => {
    //     try {
    //     const totalOrders = await knex('orders').count('id as total');
    //     const fulfilled = await knex('orders').where('delivery_status', 'Delivered').count('id as total');
    //     const rate = (fulfilled[0].total / totalOrders[0].total) * 100;
    //     res.json({ fulfillmentRate: Math.round(rate * 100) / 100 });
    //     } catch (err) {
    //     res.status(500).json({ message: err.message });
    //     }
    // },

    // /**
    //  * @swagger
    //  * /api/reports/refund-requests:
    //  *   get:
    //  *     summary: Get refund request count
    //  *     tags: [Reports]
    //  *     responses:
    //  *       200:
    //  *         description: Refund requests fetched successfully
    //  *       500:
    //  *         description: Server error
    //  */
    // refundRequests: async (req, res) => {
    //     try {
    //     const result = await knex('orders').where('status', 'Refunded').count('id as total');
    //     res.json({ refundRequests: result[0].total || 0 });
    //     } catch (err) {
    //     res.status(500).json({ message: err.message });
    //     }
    // },

    // /**
    //  * @swagger
    //  * /api/reports/return-rate:
    //  *   get:
    //  *     summary: Get return rate
    //  *     tags: [Reports]
    //  *     responses:
    //  *       200:
    //  *         description: Return rate fetched successfully
    //  *       500:
    //  *         description: Server error
    //  */
    // returnRate: async (req, res) => {
    //     try {
    //     const totalOrders = await knex('orders').count('id as total');
    //     const returned = await knex('orders').where('status', 'Returned').count('id as total');
    //     const rate = (returned[0].total / totalOrders[0].total) * 100;
    //     res.json({ returnRate: Math.round(rate * 100) / 100 });
    //     } catch (err) {
    //     res.status(500).json({ message: err.message });
    //     }
    // },

    // === CONTENT PERFORMANCE ===
    // /**
    //  * @swagger
    //  * /api/reports/page-views:
    //  *   get:
    //  *     summary: Get total page views
    //  *     tags: [Reports]
    //  *     responses:
    //  *       200:
    //  *         description: Page views fetched successfully
    //  *       500:
    //  *         description: Server error
    //  */
    // pageViews: async (req, res) => {
    //     try {
    //     const result = await knex('page_views').count('id as total');
    //     res.json({ pageViews: result[0].total || 0 });
    //     } catch (err) {
    //     res.status(500).json({ message: err.message });
    //     }
    // },

    // /**
    //  * @swagger
    //  * /api/reports/product-views:
    //  *   get:
    //  *     summary: Get product views count per product
    //  *     tags: [Reports]
    //  *     responses:
    //  *       200:
    //  *         description: Product views fetched successfully
    //  *       500:
    //  *         description: Server error
    //  */
    // productViews: async (req, res) => {
    //     try {
    //     const result = await knex('product_views')
    //         .select('product_id')
    //         .count('id as views')
    //         .groupBy('product_id');
    //     res.json({ productViews: result });
    //     } catch (err) {
    //     res.status(500).json({ message: err.message });
    //     }
    // },

    /**
     * @swagger
     * /api/reports/top-articles:
     *   get:
     *     summary: Get top 5 most viewed articles
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Top articles fetched successfully
     *       500:
     *         description: Server error
     */
    topArticles: async (req, res) => {
        try {
        const result = await knex('blog_posts')
            .leftJoin('blog_views', 'blog_posts.id', 'blog_views.post_id')
            .select('blog_posts.id', 'title')
            .count('blog_views.id as views')
            .groupBy('blog_posts.id', 'title')
            .orderBy('views', 'desc')
            .limit(5);
        res.json({ topArticles: result });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/reports/blog-views:
     *   get:
     *     summary: Get total blog views
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Blog views fetched successfully
     *       500:
     *         description: Server error
     */
    blogViews: async (req, res) => {
        try {
        const result = await knex('blog_views').count('id as total');
        res.json({ blogViews: result[0].total || 0 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    // /**
    //  * @swagger
    //  * /api/reports/blog-comments:
    //  *   get:
    //  *     summary: Get total blog comments
    //  *     tags: [Reports]
    //  *     responses:
    //  *       200:
    //  *         description: Blog comments fetched successfully
    //  *       500:
    //  *         description: Server error
    //  */
    // blogComments: async (req, res) => {
    //     try {
    //     const result = await knex('blog_comments').count('id as total');
    //     res.json({ blogComments: result[0].total || 0 });
    //     } catch (err) {
    //     res.status(500).json({ message: err.message });
    //     }
    // },

    /**
     * @swagger
     * /api/reports/engagement-rate:
     *   get:
     *     summary: Get blog engagement rate
     *     tags: [Reports]
     *     responses:
     *       200:
     *         description: Engagement rate fetched successfully
     *       500:
     *         description: Server error
     */
    engagementRate: async (req, res) => {
        try {
        const views = await knex('blog_views').count('id as total');
        const comments = await knex('blog_comments').count('id as total');
        const rate = (comments[0].total / views[0].total) * 100;
        res.json({ engagementRate: Math.round(rate * 100) / 100 });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },
};
