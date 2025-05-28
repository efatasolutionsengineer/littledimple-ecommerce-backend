const knex = require('../db/knex');

module.exports = {
  /**
   * @swagger
   * /api/reviews:
   *   post:
   *     summary: Create a new product review using product slug
   *     tags: [Reviews]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - slug
   *               - rating
   *             properties:
   *               slug:
   *                 type: string
   *                 example: "produk-keren"
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *                 example: 4
   *               review:
   *                 type: string
   *                 example: "Produk sangat bagus dan cepat sampai."
   */
  createReview: async (req, res) => {
    const { slug, rating, review } = req.body;
    const user_id = req.user.id;

    try {
      // Get the product_id from the slug
      const product = await knex('products')
        .select('id')
        .where({ slug })
        .first();

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const [newReview] = await knex('reviews')
        .insert({
          user_id,
          product_id: product.id,
          rating,
          review
        })
        .returning('*');

      res.status(201).json({ message: 'Review created', review: newReview });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/reviews/slug/{slug}:
   *   get:
   *     summary: Get paginated reviews by authenticated user (optionally filtered by product slug)
   *     tags: [Reviews]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of items per page
   *       - in: query
   *         name: slug
   *         schema:
   *           type: string
   *         description: Product slug to filter reviews by product
   *     responses:
   *       200:
   *         description: List of paginated reviews
   */
  getAllReviewsBySlug: async (req, res) => {
    // const user_id = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const { slug } = req.query;

    try {
      let productId = null;

      if (slug) {
        // Get product id from slug
        const product = await knex('products').select('id').where({ slug }).first();
        if (!product) {
          return res.status(404).json({ message: 'Product not found' });
        }
        productId = product.id;
      }

      // Count total reviews with optional product filter
      const totalQuery = knex('reviews')
        // .where({ user_id })  // Uncomment if you want user filtering
        .whereNull('deleted_at');

      if (productId) {
        totalQuery.andWhere('product_id', productId);
      }

      const totalResult = await totalQuery.count('id as count').first();

      // Query reviews with optional product filter
      const reviewsQuery = knex('reviews')
        // .where({ user_id })  // Uncomment if you want user filtering
        .whereNull('deleted_at');

      if (productId) {
        reviewsQuery.andWhere('product_id', productId);
      }

      const reviews = await reviewsQuery
        .limit(limit)
        .offset(offset)
        .orderBy('created_at', 'desc');

      const total = parseInt(totalResult.count, 10);
      const totalPages = Math.ceil(total / limit);

      res.json({
        reviews,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/reviews:
   *   get:
   *     summary: Get paginated reviews by authenticated user (optionally filtered by product slug)
   *     tags: [Reviews]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: List of paginated reviews
   */
  getAllReviews: async (req, res) => {
    // const user_id = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;    

    try {
      let productId = null;

      // Count total reviews with optional product filter
      const totalQuery = knex('reviews')
        // .where({ user_id })  // Uncomment if you want user filtering
        .whereNull('deleted_at');

      if (productId) {
        totalQuery.andWhere('product_id', productId);
      }

      const totalResult = await totalQuery.count('id as count').first();

      // Query reviews with optional product filter
      const reviewsQuery = knex('reviews')
        // .where({ user_id })  // Uncomment if you want user filtering
        .whereNull('deleted_at');

      if (productId) {
        reviewsQuery.andWhere('product_id', productId);
      }

      const reviews = await reviewsQuery
        .limit(limit)
        .offset(offset)
        .orderBy('created_at', 'desc');

      const total = parseInt(totalResult.count, 10);
      const totalPages = Math.ceil(total / limit);

      res.json({
        reviews,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },


  /**
   * @swagger
   * /api/reviews/{slug}:
   *   delete:
   *     summary: Soft delete a review by product slug
   *     tags: [Reviews]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: slug
   *         required: true
   *         schema:
   *           type: string
   *         description: Product slug
   *     responses:
   *       200:
   *         description: Review deleted
   *       404:
   *         description: Review or product not found or unauthorized
   */
  deleteReview: async (req, res) => {
    const { slug } = req.params;
    const user_id = req.user.id;

    try {
      // Find the product by slug
      const product = await knex('products')
        .select('id')
        .where({ slug })
        .first();

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Soft delete the review for that product and user
      const updated = await knex('reviews')
        .where({ user_id, product_id: product.id })
        .whereNull('deleted_at')
        .update({ deleted_at: new Date() });

      if (!updated) {
        return res.status(404).json({ message: 'Review not found or already deleted' });
      }

      res.json({ message: 'Review deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

};
