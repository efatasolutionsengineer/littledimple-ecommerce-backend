const knex = require('../db/knex');
const { isValidCoupon } = require('../models/utils.js');


module.exports = {
    /**
     * @swagger
     * /api/coupons:
     *   post:
     *     summary: Tambahkan kupon baru
     *     tags: [Coupons]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - code
     *               - discount_percentage
     *             properties:
     *               code:
     *                 type: string
     *                 example: DISKON50
     *               discount_percentage:
     *                 type: integer
     *                 example: 50
     *               valid_from:
     *                 type: string
     *                 format: date
     *               valid_until:
     *                 type: string
     *                 format: date
     */
    createCoupon: async (req, res) => {
        const { code, discount_percentage, valid_from, valid_until } = req.body;

        try {
        const [coupon] = await knex('coupons')
            .insert({
            code,
            discount_percentage,
            valid_from,
            valid_until,
            })
            .returning('*');

        res.status(201).json({ message: 'Coupon created', coupon });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/coupons:
     *   get:
     *     summary: Ambil semua kupon yang masih aktif (belum soft delete)
     *     tags: [Coupons]
     *     security:
     *       - cookieAuth: []
     */
    getAllCoupons: async (req, res) => {
        try {
        const coupons = await knex('coupons')
            .whereNull('deleted_at')
            .orderBy('valid_until', 'desc');

        res.json({ coupons });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/coupons-publish:
     *   get:
     *     summary: Ambil semua kupon yang masih aktif, untuk ditampilkan ke user (belum soft delete)
     *     tags: [Coupons]
     *     security:
     *       - cookieAuth: []
     */
    getAllCouponsPublish: async (req, res) => {
        try {
        const coupons = await knex('coupons')
            .whereNull('deleted_at')
            .where('status_publish', 'active')
            .orderBy('valid_until', 'desc');

        res.json({ coupons });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/coupons/{code}:
     *   get:
     *     summary: Ambil detail kupon berdasarkan kode
     *     tags: [Coupons]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: code
     *         required: true
     *         schema:
     *           type: string
     *         description: Kode kupon
     */
    getCouponByCode: async (req, res) => {
        try {
        const { code } = req.params;
        const coupon = await knex('coupons')
            .where({ code })
            .whereNull('deleted_at')
            .first();

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json({ coupon });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/coupons/{id}:
     *   put:
     *     summary: Update an existing coupon
     *     description: Update the details of an existing coupon, including code, discount percentage, validity, usage limits, and status.
     *     tags:
     *       - Coupons
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: The coupon ID
     *         schema:
     *           type: integer
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               code:
     *                 type: string
     *                 description: The unique code for the coupon
     *               discount_percentage:
     *                 type: integer
     *                 description: Discount percentage (1-100)
     *               valid_from:
     *                 type: string
     *                 format: date
     *                 description: The start date for coupon validity
     *               valid_until:
     *                 type: string
     *                 format: date
     *                 description: The end date for coupon validity
     *               usage_limit:
     *                 type: integer
     *                 description: The maximum number of uses for this coupon
     *               usage_count:
     *                 type: integer
     *                 description: The current number of times the coupon has been used
     *               status_publish:
     *                 type: string
     *                 enum:
     *                   - active
     *                   - inactive
     *                 description: Status indicating whether the coupon is available for use
     *               status:
     *                 type: string
     *                 enum:
     *                   - active
     *                   - inactive
     *                 description: The internal status of the coupon (active or inactive)
     *     responses:
     *       200:
     *         description: Coupon updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Coupon updated successfully
     *       400:
     *         description: Invalid input or validation error
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Invalid discount percentage
     *       404:
     *         description: Coupon not found
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Coupon not found
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Internal server error
     */
    updateCoupon: async (req, res) => {
        const { id } = req.params;
        const { code, discount_percentage, valid_from, valid_until, usage_limit, usage_count, status_publish, status } = req.body;
      
        try {
          const existing = await knex('coupons').where({ id }).whereNull('deleted_at').first();
          if (!existing) {
            return res.status(404).json({ message: 'Coupon not found' });
          }
      
          await knex('coupons')
            .where({ id })
            .update({
              code,
              discount_percentage,
              valid_from, 
              valid_until, 
              usage_limit, 
              usage_count, 
              status_publish,
              status,
            });
      
          res.json({ message: 'Coupon updated successfully' });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/coupons/{id}:
     *   delete:
     *     summary: Hapus kupon (soft delete)
     *     tags: [Coupons]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID kupon
     */
    deleteCoupon: async (req, res) => {
        const { id } = req.params;

        try {
        const deleted = await knex('coupons')
            .where({ id })
            .update({ deleted_at: new Date() });

        if (!deleted) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        res.json({ message: 'Coupon deleted' });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/validate-coupon:
     *   get:
     *     summary: Validasi kupon
     *     tags: [Coupons]
     *     parameters:
     *       - in: query
     *         name: code
     *         required: true
     *         schema:
     *           type: string
     *         description: Kode kupon yang ingin divalidasi
     *     responses:
     *       200:
     *         description: Kupon valid
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 coupon:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: integer
     *                       example: 1
     *                     code:
     *                       type: string
     *                       example: DISKON50
     *                     discount_percentage:
     *                       type: integer
     *                       example: 50
     *                     valid_from:
     *                       type: string
     *                       format: date
     *                       example: 2025-04-01
     *                     valid_until:
     *                       type: string
     *                       format: date
     *                       example: 2025-04-30
     *       400:
     *         description: Parameter code tidak diberikan
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Kode kupon diperlukan
     *       404:
     *         description: Kupon tidak ditemukan atau sudah tidak aktif
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Kupon tidak ditemukan atau sudah tidak aktif
     */
    validateCoupon: async (req, res) => {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'Kode kupon diperlukan' });
        }

        const result = await isValidCoupon(code);
        if (!result.valid) {
            return res.status(404).json({ error: result.message });
        }

        return res.json({
            success: true,
            coupon: result.coupon,
        });
    },
};
