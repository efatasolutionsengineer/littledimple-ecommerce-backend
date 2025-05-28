const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption.js');
const dayjs = require('dayjs');

/**
 * @swagger
 * tags:
 *   name: Vouchers
 *   description: Voucher management
 */

module.exports = {
  /**
   * @swagger
   * /api/vouchers:
   *   post:
   *     summary: Create a new voucher
   *     tags: [Vouchers]
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
   *               - discount
   *               - valid_from
   *               - valid_until
   *             properties:
   *               code:
   *                 type: string
   *               discount:
   *                 type: number
   *               valid_from:
   *                 type: string
   *                 format: date
   *               valid_until:
   *                 type: string
   *                 format: date
   *               user_id:
   *                 type: string
   *                 nullable: true 
   */
  createVoucher: async (req, res) => {
    const { code, discount, valid_from, valid_until, user_id } = req.body;
    try {
      const decryptedUserId = user_id ? decryptId(user_id) : null;

      const [voucher] = await knex('vouchers')
        .insert({ code, discount, valid_from, valid_until, user_id: decryptedUserId })
        .returning('*');

      voucher.id = encryptId(voucher.id);
      if (voucher.user_id) voucher.user_id = encryptId(voucher.user_id);

      res.status(201).json({ message: 'Voucher created', voucher });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/vouchers/me:
   *   get:
   *     summary: Get available vouchers member
   *     tags: [Vouchers]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of vouchers
   */
  getVouchers: async (req, res) => {
    try {
      const vouchers = await knex('vouchers')
        .leftJoin('users', 'vouchers.user_id', 'users.id') // Join ke tabel users
        .whereNull('vouchers.deleted_at')
        .where('vouchers.user_id', decryptId(req.user.id))
        .select(
          'vouchers.*',
          'users.name as user_name' // Ambil kolom name dari tabel users
        )
        .orderBy('vouchers.created_at', 'desc');
  
      const encrypted = vouchers.map(v => ({
        ...v,
        id: encryptId(v.id),
        user_id: v.user_id ? encryptId(v.user_id) : null
      }));

      res.json({ vouchers: encrypted });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/vouchers:
   *   get:
   *     summary: Get all available vouchers
   *     tags: [Vouchers]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of vouchers
   */
  getAllVouchers: async (req, res) => {
    try {
      const vouchers = await knex('vouchers')
        .leftJoin('users', 'vouchers.user_id', 'users.id') // Join ke tabel users
        .whereNull('vouchers.deleted_at')
        .select(
          'vouchers.*',
          'users.name as user_name' // Ambil kolom name dari tabel users
        )
        .orderBy('vouchers.created_at', 'desc');
  
      const encrypted = vouchers.map(v => ({
        ...v,
        id: encryptId(v.id),
        user_id: v.user_id ? encryptId(v.user_id) : null
      }));
  
      res.json({ vouchers: encrypted });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/vouchers-publish:
   *   get:
   *     summary: Get all available vouchers
   *     tags: [Vouchers]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: List of vouchers
   */
  getVouchersPublish: async (req, res) => {
    try {
      const vouchers = await knex('vouchers')
        .whereNull('deleted_at')
        .where('status_publish', 'active')
        .orderBy('created_at', 'desc');

      const encrypted = vouchers.map(v => ({
        ...v,
        id: encryptId(v.id),
        user_id: v.user_id ? encryptId(v.user_id) : null
      }));

      res.json({ vouchers: encrypted });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/vouchers/{id}:
   *   delete:
   *     summary: Soft delete a voucher
   *     tags: [Vouchers]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Voucher deleted
   */
  deleteVoucher: async (req, res) => {
    try {
      const id = decryptId(req.params.id);
      await knex('vouchers').where({ id }).update({ deleted_at: new Date() });
      res.json({ message: 'Voucher deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/vouchers/{id}:
   *   put:
   *     summary: Update a voucher
   *     tags: [Vouchers]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               code:
   *                 type: string
   *               discount:
   *                 type: number
   *               valid_from:
   *                 type: string
   *                 format: date
   *               valid_until:
   *                 type: string
   *                 format: date
   *               user_id:
   *                 type: string
   *                 nullable: true
   */
  updateVoucher: async (req, res) => {
    const { code, discount, valid_from, valid_until, user_id } = req.body;
    try {
      const id = decryptId(req.params.id);
      const decryptedUserId = user_id ? decryptId(user_id) : null;

      const [voucher] = await knex('vouchers')
        .where({ id })
        .update({ code, discount, valid_from, valid_until, user_id: decryptedUserId })
        .returning('*');

      voucher.id = encryptId(voucher.id);
      if (voucher.user_id) voucher.user_id = encryptId(voucher.user_id);

      res.json({ message: 'Voucher updated', voucher });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/vouchers/code/{code}:
   *   get:
   *     summary: Get voucher by code
   *     tags: [Vouchers]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Voucher found
   */
  getVoucherByCode: async (req, res) => {
    const { code } = req.params;
    try {
      const voucher = await knex('vouchers')
        .where({ code })
        .whereNull('deleted_at')
        .first();
      if (!voucher) {
        return res.status(404).json({ message: 'Voucher not found' });
      }

      voucher.id = encryptId(voucher.id);
      if (voucher.user_id) voucher.user_id = encryptId(voucher.user_id);
      
      res.json({ voucher });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/voucher/validate:
   *   get:
   *     summary: Validasi voucher berdasarkan kode dan (opsional) user ID
   *     tags:
   *       - Voucher
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: code
   *         schema:
   *           type: string
   *         required: true
   *         description: Kode voucher
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *           nullable: true
   *         required: false
   *         description: ID user (jika voucher bersifat personal)
   *     responses:
   *       200:
   *         description: Validasi voucher berhasil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 valid:
   *                   type: boolean
   *                   example: true
   *                 voucher:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                       example: 1
   *                     code:
   *                       type: string
   *                       example: "VOUCHER50K"
   *                     discount_amount:
   *                       type: number
   *                       format: float
   *                       example: 50000
   *                     min_purchase:
   *                       type: number
   *                       format: float
   *                       example: 100000
   *                     valid_from:
   *                       type: string
   *                       format: date
   *                       example: "2025-04-01"
   *                     valid_until:
   *                       type: string
   *                       format: date
   *                       example: "2025-04-30"
   *                     user_id:
   *                       type: integer
   *                       nullable: true
   *                       example: null
   *       400:
   *         description: Voucher tidak valid atau tidak ditemukan
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 valid:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: Voucher tidak ditemukan, sudah digunakan, atau tidak berlaku untuk user ini
   *       500:
   *         description: Terjadi kesalahan internal saat validasi
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 valid:
   *                   type: boolean
   *                   example: false
   *                 message:
   *                   type: string
   *                   example: Terjadi kesalahan saat memvalidasi voucher
   */
  validateVoucher: async (req, res) => {
    const { code, userId } = req.query;
  
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const decryptedUserId = userId ? decryptId(userId) : null;

      let voucher = null;
  
      // 1. Cek voucher umum (user_id IS NULL)
      const generalResult = await knex('vouchers')
      .where('code', code)
      .andWhere('status', 'active')
      .whereNull('deleted_at')
      .andWhere('is_used', false)
      .andWhere(builder => {
        builder
          .whereNull('valid_from')
          .orWhere('valid_from', '<=', today);
      })
      .andWhere(builder => {
        builder
          .whereNull('valid_until')
          .orWhere('valid_until', '>=', today);
      })
      .whereNull('user_id')
      .first(); // Sama dengan LIMIT 1

  
      if (generalResult.length > 0) {
        voucher = generalResult[0];
      }
  
      // 2. Jika tidak ditemukan, cek voucher personal (user_id = ?)
      if (!voucher && userId) {
        const personalResult = await knex('vouchers')
        .where('code', code)
        .andWhere('status', 'active')
        .whereNull('deleted_at')
        .andWhere('is_used', false)
        .andWhere(builder => {
          builder
            .whereNull('valid_from')
            .orWhere('valid_from', '<=', today);
        })
        .andWhere(builder => {
          builder
            .whereNull('valid_until')
            .orWhere('valid_until', '>=', today);
        })
        .andWhere('user_id', decryptedUserId)
        .first(); // Sama dengan LIMIT 1

  
        if (personalResult.length > 0) {
          voucher = personalResult[0];
        }
      }
  
      if (!voucher) {
        return res.status(400).json({
          valid: false,
          message: 'Voucher tidak ditemukan, sudah digunakan, atau tidak berlaku untuk user ini',
        });
      }
  
      return res.json({
        valid: true,
        voucher: {
          id: encryptId(voucher.id),
          code: voucher.code,
          discount_amount: parseFloat(voucher.discount_amount),
          min_purchase: parseFloat(voucher.min_purchase),
          valid_from: voucher.valid_from,
          valid_until: voucher.valid_until,
          user_id: voucher.user_id ? encryptId(voucher.user_id) : null,
        }
      });
  
    } catch (error) {
      console.error('Error validating voucher:', error);
      return res.status(500).json({
        valid: false,
        message: 'Terjadi kesalahan saat memvalidasi voucher',
      });
    }
  }
};
