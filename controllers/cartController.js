const knex = require('../db/knex');

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart operations
 */

module.exports = {
  /**
   * @swagger
   * /api/cart:
   *   get:
   *     summary: Get all cart items for the authenticated user
   *     tags: [Cart]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of cart items
   */
  getCart: async (req, res) => {
    try {
      const cart = await knex('cart')
        .where({ user_id: req.user.id })
        .whereNull('deleted_at')
        .select('*');

      res.json({ cart });
    } catch (err) {
      res.status(500).json({ message: err.message });
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
    const { product_id, quantity } = req.body;
    const user_id = req.user.id;

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
   *           type: integer
   *         description: Cart item ID
   *     responses:
   *       200:
   *         description: Cart item soft deleted
   */
  deleteCartItem: async (req, res) => {
    const { id } = req.params;

    try {
      await knex('cart')
        .where({ id })
        .update({ deleted_at: knex.fn.now() });

      res.json({ message: 'Cart item deleted (soft delete)' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};
