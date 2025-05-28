const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption.js');

/**
 * @swagger
 * components:
 *   schemas:
 *     Wishlist_Tables:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         product_id:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         deleted_at:
 *           type: date-time
 *           format: date-time
 *     Wishlist_Response:
 *       type: object
 *       properties:
 *         status:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           example: "Successfully Created Data"
 *         data:
 *           type: array
 *           items: 
 *              $ref: '#/components/schemas/Wishlist_Tables'
 *           example:
 *             - id: 1
 *               user_id: 123
 *               product_id: "abc123"
 *               created_at: "2023-01-01T00:00:00Z"
 *               deleted_at: null
 */
module.exports = {
  /**
   * @swagger
   * /api/wishlist:
   *   post:
   *     summary: Tambahkan produk ke wishlist pengguna
   *     tags: [Wishlist]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - product_id
   *             properties:
   *               product_id:
   *                 type: string
   *                 example: 2
   */
  addToWishlist: async (req, res) => {
    user_id = decryptId(req.user.id); // dekripsi user_id
    product_id = decryptId(req.body.product_id); // dekripsi product_id

    try {
      const [wishlist] = await knex('wishlists')
        .insert({ user_id, product_id })
        .returning('*');

      const encryptedId = encryptId(wishlist.id);
      delete wishlist.id;
      wishlist.encrypted_id = encryptedId;

      res.status(201).json({ message: 'Wishlist added', wishlist });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/wishlist/me:
   *   get:
   *     summary: Ambil daftar wishlist pengguna yang masih aktif
   *     tags: [Wishlist]
   *     security:
   *       - cookieAuth: []
   */
  getWishlist: async (req, res) => {
    try {
      const user_id = decryptId(req.user.id);

      const rows = await knex('wishlists')
        .where({ user_id })
        .whereNull('deleted_at');      

      const wishlist = rows.map(item => {
        const { id, product_id, ...rest } = item;
        return {
          ...rest,
          encrypted_id: encryptId(id),
          product_id: encryptId(product_id) // jika perlu disembunyikan juga
        };
      });      

      if(rows.length > 0){
        res.json({ wishlist });
      }else{
        res.status(200).json({ message: "Kamu belum memiliki wishlist" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/wishlist:
   *   get:
   *     summary: Ambil daftar wishlist semua pengguna
   *     tags: [Wishlist]
   *     security:
   *       - cookieAuth: []
   */
  getAllWishlist: async (req, res) => {
    try {

      const rows = await knex('wishlists')
        .whereNull('deleted_at');      

      const wishlist = rows.map(item => {
        const { id, product_id, ...rest } = item;
        return {
          ...rest,
          encrypted_id: encryptId(id),
          product_id: encryptId(product_id) // jika perlu disembunyikan juga
        };
      });      

      if(rows.length > 0){
        res.json({ wishlist });
      }else{
        res.status(200).json({ message: "Belum ada wishlist yang aktif" });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/wishlist/{id}:
   *   delete:
   *     summary: Hapus wishlist (soft delete)
   *     tags: [Wishlist]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID wishlist
   */
  deleteWishlist: async (req, res) => {
    const user_id = decryptId(req.user.id); // dekripsi user_id
    const wishlist_id = decryptId(req.params.id); // dekripsi encrypted wishlist ID

    try {
      const deleted = await knex('wishlists')
        .where({ id: wishlist_id, user_id })
        .update({ deleted_at: new Date() });

      if (!deleted) {
        return res.status(404).json({ message: 'Wishlist not found or unauthorized' });
      }

      res.json({ message: 'Wishlist deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};
