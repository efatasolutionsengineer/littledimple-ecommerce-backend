const knex = require('../db/knex');
const { decryptId, encryptId } = require('../models/encryption');

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart operations
 */

module.exports = {
  /**
   * @swagger
   * /api/cart/me:
   *   get:
   *     summary: Get all cart items for the authenticated user
   *     tags: [Cart]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *         example: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of items per page
   *         example: 10
   *     responses:
   *       200:
   *         description: List of cart items with pagination
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: integer
   *                   example: 200
   *                 message:
   *                   type: string
   *                   example: "Cart items retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     cart:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Cart'
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         current_page:
   *                           type: integer
   *                         per_page:
   *                           type: integer
   *                         total:
   *                           type: integer
   *                         total_pages:
   *                           type: integer
   *                         has_next:
   *                           type: boolean
   *                         has_prev:
   *                           type: boolean
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  getCart: async (req, res) => {
    try {
        user_id = decryptId(req.user.id);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Validate pagination parameters
        if (page < 1) {
            return res.status(400).json({
                status: 400,
                message: 'Page must be greater than 0',
                data: null
            });
        }

        if (limit < 1 || limit > 100) {
            return res.status(400).json({
                status: 400,
                message: 'Limit must be between 1 and 100',
                data: null
            });
        }
        
        // console.log(`decryptId(req.user.id): ${decryptId(req.user.id)}`);
        
        // Get total count
        const totalCount = await knex('cart')
            .where({ user_id: user_id })
            .whereNull('deleted_at')
            .count('id as count')
            .first();

        const total = parseInt(totalCount.count);
        const totalPages = Math.ceil(total / limit);

        // Get cart items with pagination
        const cartItems = await knex('cart')
            .where({ user_id: user_id })
            .whereNull('deleted_at')
            .select('*')
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);
        
        // Encrypt cart.id and cart.user_id
        const cart = cartItems.map(item => ({
            ...item,
            id: encryptId(item.id),
            user_id: encryptId(item.user_id),
            product_id: encryptId(item.product_id)
        }));

        const pagination = {
            current_page: page,
            per_page: limit,
            total: total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
        };

        res.status(200).json({
          status: 200,
          message: 'Cart items retrieved successfully',
          cart,
          pagination
        });
    } catch (err) {
        console.error('getCart error:', err);
        res.status(500).json({
          status: 500,
          message: 'Internal server error',
        });
    }
  },

  /**
   * @swagger
   * /api/cart:
   *   get:
   *     summary: Get all cart items from all users (Admin only)
   *     tags: [Cart]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *         example: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of items per page
   *         example: 10
   *       - in: query
   *         name: user_id
   *         schema:
   *           type: integer
   *         description: Filter by specific user ID
   *         example: 1
   *     responses:
   *       200:
   *         description: List of all cart items with pagination
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: integer
   *                   example: 200
   *                 message:
   *                   type: string
   *                   properties:
   *                     cart:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Cart'
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         current_page:
   *                           type: integer
   *                         per_page:
   *                           type: integer
   *                         total:
   *                           type: integer
   *                         total_pages:
   *                           type: integer
   *                         has_next:
   *                           type: boolean
   *                         has_prev:
   *                           type: boolean
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       500:
   *         description: Internal server error
   */
  getAllCarts: async (req, res) => {
      try {
          // Check if user is admin (adjust based on your auth system)
          // if (req.user.role !== 'admin') {
          //     return res.status(403).json({
          //         status: 403,
          //         message: 'Admin access required',
          //         //     });
          // }

          const page = parseInt(req.query.page) || 1;
          const limit = parseInt(req.query.limit) || 10;
          const user_id = req.query.user_id || null;
          const offset = (page - 1) * limit;

          // Validate pagination parameters
          if (page < 1) {
              return res.status(400).json({
                  status: 400,
                  message: 'Page must be greater than 0',
                  });
          }

          if (limit < 1 || limit > 100) {
              return res.status(400).json({
                  status: 400,
                  message: 'Limit must be between 1 and 100',
                  data: null
              });
          }

          // Build base query
          let baseQuery = knex('cart')
              .leftJoin('users', 'cart.user_id', 'users.id')
              .whereNull('cart.deleted_at');

          // Add user filter if provided
          if (user_id) {
              baseQuery = baseQuery.where('cart.user_id', user_id);
          }

          // Get total count
          const totalCount = await baseQuery.clone()
              .count('cart.id as count')
              .first();

          const total = parseInt(totalCount.count);
          const totalPages = Math.ceil(total / limit);

          // Get cart items with user info and pagination
          const cartItems = await baseQuery.clone()
              .select(
                  'cart.*',
                  'users.full_name as user_name',
                  'users.email as user_email'
              )
              .orderBy('cart.created_at', 'desc')
              .limit(limit)
              .offset(offset);
          
              // Encrypt cart.id and cart.user_id
          const cart = cartItems.map(item => ({
              ...item,
              id: encryptId(item.id),
              user_id: encryptId(item.user_id),
              product_id: encryptId(item.product_id)
          }));

          const pagination = {
              current_page: page,
              per_page: limit,
              total: total,
              total_pages: totalPages,
              has_next: page < totalPages,
              has_prev: page > 1
          };

          res.status(200).json({
              status: 200,
              message: 'All cart items retrieved successfully',
              data: {
                  cart,
                  pagination
              }
          });

      } catch (err) {
          console.error('getAllCarts error:', err);
          res.status(500).json({
              status: 500,
              message: 'Internal server error',
              data: null
          });
      }
  },

  /**
   * @swagger
   * /api/cart:
   *   post:
   *     summary: Add a product to the cart
   *     tags: [Cart]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               product_id:
   *                 type: integer
   *               quantity:
   *                 type: integer
   *             required:
   *               - product_id
   *               - quantity
   *     responses:
   *       201:
   *         description: Cart item added
   */
  addToCart: async (req, res) => {
    const { quantity } = req.body;
    const product_id = decryptId(req.body.product_id);
    const user_id = decryptId(req.user.id);

    try {
      const [existing] = await knex('cart')
        .where({ user_id, product_id })
        .whereNull('deleted_at');

      if (existing) {
        await knex('cart')
          .where({ id: existing.id })
          .update({ quantity: existing.quantity + quantity });

        return res.status(200).json({ message: 'Quantity updated' });
      }

      await knex('cart').insert({
        user_id,
        product_id,
        quantity,
      });

      res.status(201).json({ message: 'Item added to cart' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/cart/{id}:
   *   delete:
   *     summary: Soft delete a cart item
   *     tags: [Cart]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Cart item ID
   *     responses:
   *       200:
   *         description: Cart item soft deleted
   */
  deleteCartItem: async (req, res) => {
    const { id } = req.params;

    try {
      await knex('cart')
        .where({ id: decryptId(id) })
        .update({ deleted_at: knex.fn.now() });

      res.json({ message: 'Cart item deleted (soft delete)' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};
