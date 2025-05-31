const knex = require('../db/knex.js');
const { encryptId, decryptId } = require('../models/encryption.js');

/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon_Tables:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted coupon ID
 *         code:
 *           type: string
 *         is_auto_generated:
 *           type: boolean
 *         type:
 *           type: string
 *           enum: [general, shipping, regional]
 *         discount_type:
 *           type: string
 *           enum: [percentage, amount]
 *         discount_percentage:
 *           type: integer
 *         discount_amount:
 *           type: number
 *         min_purchase:
 *           type: number
 *         user_id:
 *           type: string
 *           description: Encrypted user ID
 *         usage_limit:
 *           type: integer
 *         usage_count:
 *           type: integer
 *         valid_from:
 *           type: string
 *           format: date
 *         valid_until:
 *           type: string
 *           format: date
 *         status_publish:
 *           type: string
 *           enum: [active, inactive]
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         description:
 *           type: string
 *         coverage_areas:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Coverage_Area'
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "encrypted_id_string"
 *         code: "DISCOUNT20"
 *         is_auto_generated: false
 *         type: "general"
 *         discount_type: "percentage"
 *         discount_percentage: 20
 *         min_purchase: 100000
 *         usage_limit: 100
 *         usage_count: 0
 *         valid_from: "2024-01-01"
 *         valid_until: "2024-12-31"
 *         status_publish: "active"
 *         status: "active"
 *         description: "Discount 20% for all products"
 *         created_at: "2023-01-01T00:00:00Z"
 *         updated_at: "2023-01-01T00:00:00Z"
 *     
 *     Coverage_Area:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted coverage area ID
 *         coupon_id:
 *           type: string
 *           description: Encrypted coupon ID
 *         province_id:
 *           type: integer
 *         city_id:
 *           type: integer
 *         subdistrict_id:
 *           type: integer
 *         created_at:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "encrypted_id_string"
 *         coupon_id: "encrypted_coupon_id"
 *         province_id: 1
 *         city_id: 2
 *         subdistrict_id: null
 *         created_at: "2023-01-01T00:00:00Z"
 *     
 *     Coupon_Response:
 *       type: object
 *       properties:
 *         status:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           properties:
 *             coupons:
 *               type: array
 *               items: 
 *                 $ref: '#/components/schemas/Coupon_Tables'
 *             pagination:
 *               type: object
 *               properties:
 *                 current_page:
 *                   type: integer
 *                 per_page:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 total_pages:
 *                   type: integer
 *                 has_next:
 *                   type: boolean
 *                 has_prev:
 *                   type: boolean
 */

module.exports = {
  /**
   * @swagger
   * /api/coupons:
   *   post:
   *     summary: Create new coupon (Admin only)
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
   *               - type
   *               - discount_type
   *               - valid_from
   *               - valid_until
   *             properties:
   *               code:
   *                 type: string
   *                 example: "DISCOUNT20"
   *               is_auto_generated:
   *                 type: boolean
   *                 default: false
   *               type:
   *                 type: string
   *                 enum: [general, shipping, regional]
   *                 example: "general"
   *               discount_type:
   *                 type: string
   *                 enum: [percentage, amount]
   *                 example: "percentage"
   *               discount_percentage:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 100
   *                 example: 20
   *               discount_amount:
   *                 type: number
   *                 minimum: 0
   *                 example: 50000
   *               min_purchase:
   *                 type: number
   *                 default: 0
   *                 example: 100000
   *               user_id:
   *                 type: string
   *                 description: Encrypted user ID for personal voucher
   *               usage_limit:
   *                 type: integer
   *                 example: 100
   *               valid_from:
   *                 type: string
   *                 format: date
   *                 example: "2024-01-01"
   *               valid_until:
   *                 type: string
   *                 format: date
   *                 example: "2024-12-31"
   *               status_publish:
   *                 type: string
   *                 enum: [active, inactive]
   *                 default: "inactive"
   *               status:
   *                 type: string
   *                 enum: [active, inactive]
   *                 default: "active"
   *               description:
   *                 type: string
   *                 example: "Discount 20% for all products"
   *               coverage_areas:
   *                 type: array
   *                 description: Required when type is 'regional'
   *                 items:
   *                   type: object
   *                   properties:
   *                     province_id:
   *                       type: integer
   *                     city_id:
   *                       type: integer
   *                     subdistrict_id:
   *                       type: integer
   *                 example:
   *                   - province_id: 1
   *                     city_id: 2
   *                     subdistrict_id: null
   *     responses:
   *       201:
   *         description: Coupon created successfully
   *       400:
   *         description: Bad request - validation errors
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       500:
   *         description: Internal server error
   */
  createCoupon: async (req, res) => {
    const trx = await knex.transaction();
    
    try {
      // Check if user is admin
      const decryptedUserId = decryptId(req.user.id);
      const adminCheck = await knex('admins')
        .where('user_id', decryptedUserId)
        .whereNull('deleted_at')
        .first();

      if (!adminCheck) {
        await trx.rollback();
        return res.status(403).json({
          status: 403,
          message: 'Access denied. Admin privileges required.',
          data: null
        });
      }

      const {
        code,
        is_auto_generated = false,
        type,
        discount_type,
        discount_percentage,
        discount_amount,
        min_purchase = 0,
        user_id,
        usage_limit,
        valid_from,
        valid_until,
        status_publish = 'inactive',
        status = 'active',
        description,
        coverage_areas
      } = req.body;

      // Validation
      if (!code || !type || !discount_type || !valid_from || !valid_until) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'Required fields: code, type, discount_type, valid_from, valid_until',
          data: null
        });
      }

      // Validate discount fields
      if (discount_type === 'percentage' && (!discount_percentage || discount_percentage < 1 || discount_percentage > 100)) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'discount_percentage must be between 1 and 100 for percentage type',
          data: null
        });
      }

      if (discount_type === 'amount' && (!discount_amount || discount_amount <= 0)) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'discount_amount must be greater than 0 for amount type',
          data: null
        });
      }

      // Validate regional type requires coverage areas
      if (type === 'regional' && (!coverage_areas || !Array.isArray(coverage_areas) || coverage_areas.length === 0)) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'coverage_areas is required for regional type coupons',
          });
      }

      // Check if code already exists
      const existingCoupon = await trx('coupons')
        .where('code', code)
        .whereNull('deleted_at')
        .first();

      if (existingCoupon) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'Coupon code already exists',
          data: null
        });
      }

      // Prepare coupon data
      const couponData = {
        code,
        is_auto_generated,
        type,
        discount_type,
        min_purchase,
        usage_limit,
        usage_count: 0,
        valid_from,
        valid_until,
        status_publish,
        status,
        description
      };

      // Add discount fields based on type
      if (discount_type === 'percentage') {
        couponData.discount_percentage = discount_percentage;
      } else {
        couponData.discount_amount = discount_amount;
      }

      // Add user_id if provided
      if (user_id) {
        couponData.user_id = decryptId(user_id);
      }

      // Create coupon
      const [newCoupon] = await trx('coupons')
        .insert(couponData)
        .returning('*');

      // Create coverage areas if type is regional
      if (type === 'regional' && coverage_areas) {
        const coverageData = coverage_areas.map(area => ({
          coupon_id: newCoupon.id,
          province_id: area.province_id || null,
          city_id: area.city_id || null,
          subdistrict_id: area.subdistrict_id || null
        }));

        await trx('coupon_coverage_areas').insert(coverageData);
      }

      await trx.commit();

      // Encrypt IDs in response
      newCoupon.id = encryptId(newCoupon.id);
      if (newCoupon.user_id) {
        newCoupon.user_id = encryptId(newCoupon.user_id);
      }

      res.status(201).json({
        status: 201,
        message: 'Coupon created successfully',
        data: newCoupon
      });

    } catch (err) {
      await trx.rollback();
      console.error('createCoupon error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid user ID format',
          });
      }

      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null
      });
    }
  },

  /**
   * @swagger
   * /api/coupons:
   *   get:
   *     summary: Get all coupons with pagination, filtering, sorting, and search (Admin only)
   *     tags: [Coupons]
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
   *         name: sort_order
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order for created_at
   *         example: desc
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, inactive]
   *         description: Filter by status
   *         example: active
   *       - in: query
   *         name: date_from
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter created_at from date (YYYY-MM-DD)
   *         example: "2023-01-01"
   *       - in: query
   *         name: date_to
   *         schema:
   *           type: string
   *           format: date
   *         description: Filter created_at to date (YYYY-MM-DD)
   *         example: "2023-12-31"
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search across all fields
   *         example: "DISCOUNT"
   *     responses:
   *       200:
   *         description: Coupons retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Coupon_Response'
   *       400:
   *         description: Bad request - invalid parameters
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access require
   *       500:
   *         description: Internal server error
   */
  getAllCoupons: async (req, res) => {
    try {
      // Check if user is admin
      const decryptedUserId = decryptId(req.user.id);
      const adminCheck = await knex('admins')
        .where('user_id', decryptedUserId)
        .whereNull('deleted_at')
        .first();

      if (!adminCheck) {
        return res.status(403).json({
          status: 403,
          message: 'Access denied. Admin privileges required.',
          data: null
        });
      }

      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Sorting parameters
      const sort_order = req.query.sort_order || 'desc';

      // Filter parameters
      const status = req.query.status;
      const date_from = req.query.date_from;
      const date_to = req.query.date_to;
      const search = req.query.search;

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
          });
      }

      // Validate sort order
      const validSortOrders = ['asc', 'desc'];
      if (!validSortOrders.includes(sort_order)) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid sort_order. Must be: asc, desc',
          data: null
        });
      }

      // Build base query
      let baseQuery = knex('coupons')
        .whereNull('deleted_at');

      // Apply status filter
      if (status) {
        const validStatuses = ['active', 'inactive'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            status: 400,
            message: 'Invalid status. Must be: active, inactive',
            data: null
          });
        }
        baseQuery = baseQuery.where('status', status);
      }

      // Date range filter
      if (date_from || date_to) {
        if (date_from && date_to) {
          baseQuery = baseQuery.whereBetween('created_at', [date_from, date_to + ' 23:59:59']);
        } else if (date_from) {
          baseQuery = baseQuery.where('created_at', '>=', date_from);
        } else if (date_to) {
          baseQuery = baseQuery.where('created_at', '<=', date_to + ' 23:59:59');
        }
      }

      // Search across multiple fields
      if (search) {
        baseQuery = baseQuery.where(function() {
          this.where('code', 'ilike', `%${search}%`)
            .orWhere('type', 'ilike', `%${search}%`)
            .orWhere('discount_type', 'ilike', `%${search}%`)
            .orWhere('status_publish', 'ilike', `%${search}%`)
            .orWhere('status', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
        });
      }

      // Get total count
      const totalCount = await baseQuery.clone()
        .count('id as count')
        .first();

      const total = parseInt(totalCount.count);
      const totalPages = Math.ceil(total / limit);

      // Get coupon data with pagination and sorting
      const couponData = await baseQuery.clone()
        .select('*')
        .orderBy('id', 'desc') // Default order by id desc
        .orderBy('created_at', sort_order) // Then by created_at
        .limit(limit)
        .offset(offset);

      // Get coverage areas for regional coupons and encrypt IDs
      const coupons = await Promise.all(couponData.map(async (coupon) => {
        let coverage_areas = [];
        
        if (coupon.type === 'regional') {
          const areas = await knex('coupon_coverage_areas')
            .where('coupon_id', coupon.id)
            .select('*');
          
          coverage_areas = areas.map(area => ({
            ...area,
            id: encryptId(area.id),
            coupon_id: encryptId(area.coupon_id)
          }));
        }

        return {
          ...coupon,
          id: encryptId(coupon.id),
          user_id: coupon.user_id ? encryptId(coupon.user_id) : null,
          coverage_areas
        };
      }));

      const pagination = {
        current_page: page,
        per_page: limit,
        total: total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      };

      // Applied filters for response
      const appliedFilters = {
        sort_order: sort_order,
        status: status || null,
        date_from: date_from || null,
        date_to: date_to || null,
        search: search || null
      };

      res.status(200).json({
        status: 200,
        message: 'Coupons retrieved successfully',
        data: {
          coupons,
          pagination,
          filters: appliedFilters
        }
      });

    } catch (err) {
      console.error('getAllCoupons error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(401).json({
          status: 401,
          message: 'Invalid authentication token',
          });
      }

      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null
      });
    }
  },

  /**
   * @swagger
   * /api/coupons/{id}:
   *   get:
   *     summary: Get coupon by ID (Admin only)
   *     tags: [Coupons]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Encrypted coupon ID
   *     responses:
   *       200:
   *         description: Coupon retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       404:
   *         description: Coupon not found
   *       500:
   *         description: Internal server error
   */
  getCouponById: async (req, res) => {
    try {
      // Check if user is admin
      const decryptedUserId = decryptId(req.user.id);
      const adminCheck = await knex('admins')
        .where('user_id', decryptedUserId)
        .whereNull('deleted_at')
        .first();

      if (!adminCheck) {
        return res.status(403).json({
          status: 403,
          message: 'Access denied. Admin privileges required.',
          data: null
        });
      }

      const coupon_id = decryptId(req.params.id);
      
      const coupon = await knex('coupons')
        .where('id', coupon_id)
        .whereNull('deleted_at')
        .first();

      if (!coupon) {
        return res.status(404).json({
          status: 404,
          message: 'Coupon not found',
          });
      }

      // Get coverage areas if regional coupon
      let coverage_areas = [];
      if (coupon.type === 'regional') {
        const areas = await knex('coupon_coverage_areas')
          .where('coupon_id', coupon.id)
          .select('*');
        
        coverage_areas = areas.map(area => ({
          ...area,
          id: encryptId(area.id),
          coupon_id: encryptId(area.coupon_id)
        }));
      }

      // Encrypt IDs
      coupon.id = encryptId(coupon.id);
      if (coupon.user_id) {
        coupon.user_id = encryptId(coupon.user_id);
      }
      coupon.coverage_areas = coverage_areas;

      res.status(200).json({
        status: 200,
        message: 'Coupon retrieved successfully',
        data: coupon
      });

    } catch (err) {
      console.error('getCouponById error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid ID format',
          data: null
        });
      }

      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null
      });
    }
  },

  /**
   * @swagger
   * /api/coupons/{id}:
   *   put:
   *     summary: Update coupon (Admin only)
   *     tags: [Coupons]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Encrypted coupon ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               code:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [general, shipping, regional]
   *               discount_type:
   *                 type: string
   *                 enum: [percentage, amount]
   *               discount_percentage:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 100
   *               discount_amount:
   *                 type: number
   *                 minimum: 0
   *               min_purchase:
   *                 type: number
   *               user_id:
   *                 type: string
   *                 description: Encrypted user ID
   *               usage_limit:
   *                 type: integer
   *               valid_from:
   *                 type: string
   *                 format: date
   *               valid_until:
   *                 type: string
   *                 format: date
   *               status_publish:
   *                 type: string
   *                 enum: [active, inactive]
   *               status:
   *                 type: string
   *                 enum: [active, inactive]
   *               description:
   *                 type: string
   *               coverage_areas:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     province_id:
   *                       type: integer
   *                     city_id:
   *                       type: integer
   *                     subdistrict_id:
   *                       type: integer
   *     responses:
   *       200:
   *         description: Coupon updated successfully
   *       400:
   *         description: Bad request - validation errors
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       404:
   *         description: Coupon not found
   *       500:
   *         description: Internal server error
   */
  updateCoupon: async (req, res) => {
    const trx = await knex.transaction();
    
    try {
      // Check if user is admin
      const decryptedUserId = decryptId(req.user.id);
      const adminCheck = await knex('admins')
        .where('user_id', decryptedUserId)
        .whereNull('deleted_at')
        .first();

      if (!adminCheck) {
        await trx.rollback();
        return res.status(403).json({
          status: 403,
          message: 'Access denied. Admin privileges required.',
          data: null
        });
      }

      const coupon_id = decryptId(req.params.id);
      const {
        code,
        type,
        discount_type,
        discount_percentage,
        discount_amount,
        min_purchase,
        user_id,
        usage_limit,
        valid_from,
        valid_until,
        status_publish,
        status,
        description,
        coverage_areas
      } = req.body;

      // Check if coupon exists
      const existingCoupon = await trx('coupons')
        .where('id', coupon_id)
        .whereNull('deleted_at')
        .first();

      if (!existingCoupon) {
        await trx.rollback();
        return res.status(404).json({
          status: 404,
          message: 'Coupon not found',
          });
      }

      // Check if code is being changed and if new code already exists
      if (code && code !== existingCoupon.code) {
        const codeExists = await trx('coupons')
          .where('code', code)
          .whereNot('id', coupon_id)
          .whereNull('deleted_at')
          .first();

        if (codeExists) {
          await trx.rollback();
          return res.status(400).json({
            status: 400,
            message: 'Coupon code already exists',
            });
        }
      }

      // Validate discount fields if provided
      if (discount_type === 'percentage' && discount_percentage && (discount_percentage < 1 || discount_percentage > 100)) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'discount_percentage must be between 1 and 100',
          data: null
        });
      }

      if (discount_type === 'amount' && discount_amount && discount_amount <= 0) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'discount_amount must be greater than 0',
          data: null
        });
      }

      // Prepare update data
      const updateData = {
        updated_at: knex.fn.now()
      };

      // Add fields that are provided
      if (code !== undefined) updateData.code = code;
      if (type !== undefined) updateData.type = type;
      if (discount_type !== undefined) updateData.discount_type = discount_type;
      if (discount_percentage !== undefined) updateData.discount_percentage = discount_percentage;
      if (discount_amount !== undefined) updateData.discount_amount = discount_amount;
      if (min_purchase !== undefined) updateData.min_purchase = min_purchase;
      if (usage_limit !== undefined) updateData.usage_limit = usage_limit;
      if (valid_from !== undefined) updateData.valid_from = valid_from;
      if (valid_until !== undefined) updateData.valid_until = valid_until;
      if (status_publish !== undefined) updateData.status_publish = status_publish;
      if (status !== undefined) updateData.status = status;
      if (description !== undefined) updateData.description = description;
      if (user_id !== undefined) updateData.user_id = user_id ? decryptId(user_id) : null;

      // Update coupon
      const [updatedCoupon] = await trx('coupons')
        .where('id', coupon_id)
        .update(updateData)
        .returning('*');

      // Handle coverage areas if type is regional
      if (type === 'regional' && coverage_areas) {
        // Delete existing coverage areas
        await trx('coupon_coverage_areas')
          .where('coupon_id', coupon_id)
          .del();

        // Insert new coverage areas
        if (coverage_areas.length > 0) {
          const coverageData = coverage_areas.map(area => ({
            coupon_id: coupon_id,
            province_id: area.province_id || null,
            city_id: area.city_id || null,
            subdistrict_id: area.subdistrict_id || null
          }));

          await trx('coupon_coverage_areas').insert(coverageData);
        }
      }

      await trx.commit();

      // Encrypt IDs in response
      updatedCoupon.id = encryptId(updatedCoupon.id);
      if (updatedCoupon.user_id) {
        updatedCoupon.user_id = encryptId(updatedCoupon.user_id);
      }

      res.status(200).json({
        status: 200,
        message: 'Coupon updated successfully',
        data: updatedCoupon
      });

    } catch (err) {
      await trx.rollback();
      console.error('updateCoupon error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid ID format',
          data: null
        });
      }

      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        });
    }
  },

  /**
   * @swagger
   * /api/coupons/{id}:
   *   delete:
   *     summary: Delete coupon (soft delete) (Admin only)
   *     tags: [Coupons]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Encrypted coupon ID
   *     responses:
   *       200:
   *         description: Coupon deleted successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       404:
   *         description: Coupon not found
   *       500:
   *         description: Internal server error
   */
  deleteCoupon: async (req, res) => {
    try {
      // Check if user is admin
      const decryptedUserId = decryptId(req.user.id);
      const adminCheck = await knex('admins')
        .where('user_id', decryptedUserId)
        .whereNull('deleted_at')
        .first();

      if (!adminCheck) {
        return res.status(403).json({
          status: 403,
          message: 'Access denied. Admin privileges required.',
          });
      }

      const coupon_id = decryptId(req.params.id);
      
      // Soft delete: update deleted_at and updated_at timestamps
      const deleted = await knex('coupons')
        .where('id', coupon_id)
        .whereNull('deleted_at') // Only delete if not already deleted
        .update({
          deleted_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });

      if (!deleted) {
        return res.status(404).json({
          status: 404,
          message: 'Coupon not found or already deleted',
          });
      }

      res.status(200).json({
        status: 200,
        message: 'Coupon deleted successfully',
        });

    } catch (err) {
      console.error('deleteCoupon error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid coupon ID format',
          data: null
        });
      }

      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null
      });
    }
  },

  /**
   * @swagger
   * /api/coupons/code/{code}:
   *   get:
   *     summary: Get coupon by code (Public access)
   *     tags: [Coupons]
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *         description: Coupon code
   *         example: "DISCOUNT20"
   *     responses:
   *       200:
   *         description: Coupon retrieved successfully
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
   *                   example: "Coupon retrieved successfully"
   *                 data:
   *                   $ref: '#/components/schemas/Coupon_Tables'
   *       404:
   *         description: Coupon not found or not active
   *       500:
   *         description: Internal server error
   */
  getCouponByCode: async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({
          status: 400,
          message: 'Coupon code is required',
          data: null
        });
      }

      // Get coupon by code (only active and published coupons)
      const coupon = await knex('coupons')
        .where('code', code)
        .where('status', 'active')
        .where('status_publish', 'active')
        .whereNull('deleted_at')
        .where('valid_from', '<=', knex.fn.now())
        .where('valid_until', '>=', knex.fn.now())
        .first();

      if (!coupon) {
        return res.status(404).json({
          status: 404,
          message: 'Coupon not found or not available',
          data: null
        });
      }

      // Check if coupon has reached usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return res.status(404).json({
          status: 404,
          message: 'Coupon usage limit reached',
          });
      }

      // Get coverage areas if regional coupon
      let coverage_areas = [];
      if (coupon.type === 'regional') {
        const areas = await knex('coupon_coverage_areas')
          .where('coupon_id', coupon.id)
          .select('*');
        
        coverage_areas = areas.map(area => ({
          ...area,
          id: encryptId(area.id),
          coupon_id: encryptId(area.coupon_id)
        }));
      }

      // Encrypt IDs in response
      coupon.id = encryptId(coupon.id);
      if (coupon.user_id) {
        coupon.user_id = encryptId(coupon.user_id);
      }
      coupon.coverage_areas = coverage_areas;

      res.status(200).json({
        status: 200,
        message: 'Coupon retrieved successfully',
        data: coupon
      });

    } catch (err) {
      console.error('getCouponByCode error:', err);
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null
      });
    }
  },

  /**
   * @swagger
   * /api/coupons/publish:
   *   get:
   *     summary: Get all published and active coupons (Public access)
   *     tags: [Coupons]
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
   *         name: type
   *         schema:
   *           type: string
   *           enum: [general, shipping, regional]
   *         description: Filter by coupon type
   *         example: "general"
   *       - in: query
   *         name: discount_type
   *         schema:
   *           type: string
   *           enum: [percentage, amount]
   *         description: Filter by discount type
   *         example: "percentage"
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in code and description
   *         example: "DISCOUNT"
   *     responses:
   *       200:
   *         description: Published coupons retrieved successfully
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
   *                   example: "Published coupons retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     coupons:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Coupon_Tables'
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
   *       400:
   *         description: Bad request - invalid parameters
   *       500:
   *         description: Internal server error
   */
  getAllCouponsPublish: async (req, res) => {
    try {
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Filter parameters
      const type = req.query.type;
      const discount_type = req.query.discount_type;
      const search = req.query.search;

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

      // Build base query (only published, active, and valid coupons)
      let baseQuery = knex('coupons')
        .where('status', 'active')
        .where('status_publish', 'active')
        .whereNull('deleted_at')
        .where('valid_from', '<=', knex.fn.now())
        .where('valid_until', '>=', knex.fn.now())
        .where(function() {
          // Only show coupons that haven't reached usage limit or have no limit
          this.whereNull('usage_limit')
            .orWhereRaw('usage_count < usage_limit');
        });

      // Apply type filter
      if (type) {
        const validTypes = ['general', 'shipping', 'regional'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({
            status: 400,
            message: 'Invalid type. Must be: general, shipping, regional',
            data: null
          });
        }
        baseQuery = baseQuery.where('type', type);
      }

      // Apply discount_type filter
      if (discount_type) {
        const validDiscountTypes = ['percentage', 'amount'];
        if (!validDiscountTypes.includes(discount_type)) {
          return res.status(400).json({
            status: 400,
            message: 'Invalid discount_type. Must be: percentage, amount',
            data: null
          });
        }
        baseQuery = baseQuery.where('discount_type', discount_type);
      }

      // Search in code and description
      if (search) {
        baseQuery = baseQuery.where(function() {
          this.where('code', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
        });
      }

      // Get total count
      const totalCount = await baseQuery.clone()
        .count('id as count')
        .first();

      const total = parseInt(totalCount.count);
      const totalPages = Math.ceil(total / limit);

      // Get coupon data with pagination
      const couponData = await baseQuery.clone()
        .select([
          'id', 'code', 'type', 'discount_type', 'discount_percentage', 
          'discount_amount', 'min_purchase', 'usage_limit', 'usage_count',
          'valid_from', 'valid_until', 'description', 'created_at'
        ]) // Don't expose sensitive fields like user_id
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Get coverage areas for regional coupons and encrypt IDs
      const coupons = await Promise.all(couponData.map(async (coupon) => {
        let coverage_areas = [];
        
        if (coupon.type === 'regional') {
          const areas = await knex('coupon_coverage_areas')
            .where('coupon_id', coupon.id)
            .select('*');
          
          coverage_areas = areas.map(area => ({
            ...area,
            id: encryptId(area.id),
            coupon_id: encryptId(area.coupon_id)
          }));
        }

        return {
          ...coupon,
          id: encryptId(coupon.id),
          coverage_areas
        };
      }));

      const pagination = {
        current_page: page,
        per_page: limit,
        total: total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      };

      // Applied filters for response
      const appliedFilters = {
        type: type || null,
        discount_type: discount_type || null,
        search: search || null
      };

      res.status(200).json({
        status: 200,
        message: 'Published coupons retrieved successfully',
        data: {
          coupons,
          pagination,
          filters: appliedFilters
        }
      });

    } catch (err) {
      console.error('getAllCouponsPublish error:', err);
      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null
      });
    }
  },

  /**
   * @swagger
   * /api/coupons/me:
   *   get:
   *     summary: Get user's personal coupons and general coupons
   *     tags: [Coupons]
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
   *         name: type
   *         schema:
   *           type: string
   *           enum: [general, shipping, regional]
   *         description: Filter by coupon type
   *         example: "general"
   *       - in: query
   *         name: discount_type
   *         schema:
   *           type: string
   *           enum: [percentage, amount]
   *         description: Filter by discount type
   *         example: "percentage"
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in code and description
   *         example: "DISCOUNT"
   *       - in: query
   *         name: show_expired
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Include expired coupons
   *         example: false
   *     responses:
   *       200:
   *         description: User coupons retrieved successfully
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
   *                   example: "User coupons retrieved successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     coupons:
   *                       type: array
   *                       items:
   *                         allOf:
   *                           - $ref: '#/components/schemas/Coupon_Tables'
   *                           - type: object
   *                             properties:
   *                               is_personal:
   *                                 type: boolean
   *                                 description: Whether this is a personal coupon for the user
   *                               is_expired:
   *                                 type: boolean
   *                                 description: Whether the coupon is expired
   *                               is_used_up:
   *                                 type: boolean
   *                                 description: Whether the coupon has reached usage limit
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
   *                     summary:
   *                       type: object
   *                       properties:
   *                         total_coupons:
   *                           type: integer
   *                         personal_coupons:
   *                           type: integer
   *                         general_coupons:
   *                           type: integer
   *                         active_coupons:
   *                           type: integer
   *                         expired_coupons:
   *                           type: integer
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Internal server error
   */
  getCouponMe: async (req, res) => {
    try {
      const user_id = decryptId(req.user.id);
      
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Filter parameters
      const type = req.query.type;
      const discount_type = req.query.discount_type;
      const search = req.query.search;
      const show_expired = req.query.show_expired === 'true';

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

      // Build base query for user's coupons
      let baseQuery = knex('coupons')
        .where('status_publish', 'active')
        .where('status', 'active')
        .whereNull('deleted_at')
        .where(function() {
          // Personal coupons for this user OR general coupons (user_id is null)
          this.where('user_id', user_id)
            .orWhereNull('user_id');
        });

      // Date validation (unless showing expired coupons)
      if (!show_expired) {
        baseQuery = baseQuery
          .where('valid_from', '<=', knex.fn.now())
          .where('valid_until', '>=', knex.fn.now());
      }

      // Apply type filter
      if (type) {
        const validTypes = ['general', 'shipping', 'regional'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({
            status: 400,
            message: 'Invalid type. Must be: general, shipping, regional',
            data: null
          });
        }
        baseQuery = baseQuery.where('type', type);
      }

      // Apply discount_type filter
      if (discount_type) {
        const validDiscountTypes = ['percentage', 'amount'];
        if (!validDiscountTypes.includes(discount_type)) {
          return res.status(400).json({
            status: 400,
            message: 'Invalid discount_type. Must be: percentage, amount',
            data: null
          });
        }
        baseQuery = baseQuery.where('discount_type', discount_type);
      }

      // Search in code and description
      if (search) {
        baseQuery = baseQuery.where(function() {
          this.where('code', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
        });
      }

      // Get total count
      const totalCount = await baseQuery.clone()
        .count('id as count')
        .first();

      const total = parseInt(totalCount.count);
      const totalPages = Math.ceil(total / limit);

      // Get coupon data with pagination
      const couponData = await baseQuery.clone()
        .select('*')
        .orderBy(knex.raw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [user_id])) // Personal coupons first
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Get coverage areas for regional coupons and add additional info
      const coupons = await Promise.all(couponData.map(async (coupon) => {
        let coverage_areas = [];
        
        if (coupon.type === 'regional') {
          const areas = await knex('coupon_coverage_areas')
            .where('coupon_id', coupon.id)
            .select('*');
          
          coverage_areas = areas.map(area => ({
            ...area,
            id: encryptId(area.id),
            coupon_id: encryptId(area.coupon_id)
          }));
        }

        // Calculate additional status info
        const now = new Date();
        const validFrom = new Date(coupon.valid_from);
        const validUntil = new Date(coupon.valid_until);
        const isExpired = now > validUntil || now < validFrom;
        const isUsedUp = coupon.usage_limit && coupon.usage_count >= coupon.usage_limit;
        const isPersonal = coupon.user_id === user_id;

        return {
          ...coupon,
          id: encryptId(coupon.id),
          user_id: coupon.user_id ? encryptId(coupon.user_id) : null,
          coverage_areas,
          is_personal: isPersonal,
          is_expired: isExpired,
          is_used_up: isUsedUp,
          is_available: !isExpired && !isUsedUp
        };
      }));

      // Get summary statistics
      const summaryQuery = knex('coupons')
        .where('status_publish', 'active')
        .where('status', 'active')
        .whereNull('deleted_at')
        .where(function() {
          this.where('user_id', user_id)
            .orWhereNull('user_id');
        });

      const [
        totalCoupons,
        personalCoupons,
        generalCoupons,
        activeCoupons,
        expiredCoupons
      ] = await Promise.all([
        summaryQuery.clone().count('id as count').first(),
        summaryQuery.clone().where('user_id', user_id).count('id as count').first(),
        summaryQuery.clone().whereNull('user_id').count('id as count').first(),
        summaryQuery.clone()
          .where('valid_from', '<=', knex.fn.now())
          .where('valid_until', '>=', knex.fn.now())
          .where(function() {
            this.whereNull('usage_limit')
              .orWhereRaw('usage_count < usage_limit');
          })
          .count('id as count').first(),
        summaryQuery.clone()
          .where(function() {
            this.where('valid_until', '<', knex.fn.now())
              .orWhere('valid_from', '>', knex.fn.now())
              .orWhereRaw('usage_limit IS NOT NULL AND usage_count >= usage_limit');
          })
          .count('id as count').first()
      ]);

      const pagination = {
        current_page: page,
        per_page: limit,
        total: total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1
      };

      const summary = {
        total_coupons: parseInt(totalCoupons.count),
        personal_coupons: parseInt(personalCoupons.count),
        general_coupons: parseInt(generalCoupons.count),
        active_coupons: parseInt(activeCoupons.count),
        expired_coupons: parseInt(expiredCoupons.count)
      };

      // Applied filters for response
      const appliedFilters = {
        type: type || null,
        discount_type: discount_type || null,
        search: search || null,
        show_expired: show_expired
      };

      res.status(200).json({
        status: 200,
        message: 'User coupons retrieved successfully',
        data: {
          coupons,
          pagination,
          summary,
          filters: appliedFilters
        }
      });

    } catch (err) {
      console.error('getCouponMe error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(401).json({
          status: 401,
          message: 'Invalid authentication token',
          });
      }

      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null
      });
    }
  },

  /**
   * @swagger
   * /api/coupons/apply:
   *   post:
   *     summary: Apply/validate coupon code for user order
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
   *               - order_amount
   *             properties:
   *               code:
   *                 type: string
   *                 description: Coupon code to apply
   *                 example: "DISCOUNT20"
   *               order_amount:
   *                 type: number
   *                 description: Total order amount before discount
   *                 example: 150000
   *               shipping_cost:
   *                 type: number
   *                 description: Shipping cost (required for shipping type coupons)
   *                 example: 25000
   *               destination:
   *                 type: object
   *                 description: Destination details (required for regional coupons)
   *                 properties:
   *                   province_id:
   *                     type: integer
   *                     example: 1
   *                   city_id:
   *                     type: integer
   *                     example: 2
   *                   subdistrict_id:
   *                     type: integer
   *                     example: 3
   *               dry_run:
   *                 type: boolean
   *                 description: If true, only validate without incrementing usage count
   *                 default: true
   *                 example: true
   *     responses:
   *       200:
   *         description: Coupon applied successfully
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
   *                   example: "Coupon applied successfully"
   *                 data:
   *                   type: object
   *                   properties:
   *                     coupon:
   *                       $ref: '#/components/schemas/Coupon_Tables'
   *                     discount_calculation:
   *                       type: object
   *                       properties:
   *                         original_amount:
   *                           type: number
   *                           example: 150000
   *                         discount_amount:
   *                           type: number
   *                           example: 30000
   *                         final_amount:
   *                           type: number
   *                           example: 120000
   *                         discount_percentage:
   *                           type: number
   *                           example: 20
   *                         applicable_to:
   *                           type: string
   *                           enum: [order, shipping]
   *                           example: "order"
   *                         original_shipping:
   *                           type: number
   *                           example: 25000
   *                         final_shipping:
   *                           type: number
   *                           example: 25000
   *                     validation:
   *                       type: object
   *                       properties:
   *                         is_valid:
   *                           type: boolean
   *                           example: true
   *                         is_personal:
   *                           type: boolean
   *                           example: false
   *                         is_regional:
   *                           type: boolean
   *                           example: false
   *                         remaining_usage:
   *                           type: integer
   *                           example: 95
   *                         expires_at:
   *                           type: string
   *                           format: date
   *                           example: "2024-12-31"
   *       400:
   *         description: Bad request - validation errors
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Coupon not found or not applicable
   *       422:
   *         description: Coupon validation failed
   *       500:
   *         description: Internal server error
   */
  applyCoupon: async (req, res) => {
    const trx = await knex.transaction();
    
    try {
      const user_id = decryptId(req.user.id);
      const { 
        code, 
        order_amount, 
        shipping_cost = 0, 
        destination = {}, 
        dry_run = true 
      } = req.body;

      // Validation
      if (!code || !order_amount) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'Required fields: code, order_amount',
          data: null
        });
      }

      if (order_amount <= 0) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'Order amount must be greater than 0',
          data: null
        });
      }

      // Get coupon by code
      const coupon = await trx('coupons')
        .where('code', code)
        .where('status', 'active')
        .where('status_publish', 'active')
        .whereNull('deleted_at')
        .where('valid_from', '<=', knex.fn.now())
        .where('valid_until', '>=', knex.fn.now())
        .first();

      if (!coupon) {
        await trx.rollback();
        return res.status(404).json({
          status: 404,
          message: 'Coupon not found or not available',
          data: null
        });
      }

      // Check if coupon has reached usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        await trx.rollback();
        return res.status(422).json({
          status: 422,
          message: 'Coupon usage limit reached',
          });
      }

      // Check if personal coupon belongs to user or is general
      if (coupon.user_id && coupon.user_id !== user_id) {
        await trx.rollback();
        return res.status(422).json({
          status: 422,
          message: 'This coupon is not available for your account',
          data: null
        });
      }

      // Check minimum purchase requirement
      if (coupon.min_purchase && order_amount < coupon.min_purchase) {
        await trx.rollback();
        return res.status(422).json({
          status: 422,
          message: `Minimum purchase amount is ${coupon.min_purchase}`,
          data: null
        });
      }

      // Check regional restrictions
      if (coupon.type === 'regional') {
        const { province_id, city_id, subdistrict_id } = destination;
        
        if (!province_id && !city_id && !subdistrict_id) {
          await trx.rollback();
          return res.status(400).json({
            status: 400,
            message: 'Destination details required for regional coupon',
            data: null
          });
        }

        const coverageAreas = await trx('coupon_coverage_areas')
          .where('coupon_id', coupon.id);

        const isInCoverage = coverageAreas.some(area => {
          // Check if destination matches any coverage area
          if (area.subdistrict_id && subdistrict_id) {
            return area.subdistrict_id === subdistrict_id;
          }
          if (area.city_id && city_id) {
            return area.city_id === city_id;
          }
          if (area.province_id && province_id) {
            return area.province_id === province_id;
          }
          return false;
        });

        if (!isInCoverage) {
          await trx.rollback();
          return res.status(422).json({
            status: 422,
            message: 'Coupon is not available for your delivery location',
            data: null
          });
        }
      }

      // Check shipping coupon requirements
      if (coupon.type === 'shipping' && shipping_cost <= 0) {
        await trx.rollback();
        return res.status(400).json({
          status: 400,
          message: 'Shipping cost required for shipping coupon',
          data: null
        });
      }

      // Calculate discount
      let discount_amount = 0;
      let applicable_amount = order_amount;
      let applicable_to = 'order';

      // For shipping coupons, apply discount to shipping cost
      if (coupon.type === 'shipping') {
        applicable_amount = shipping_cost;
        applicable_to = 'shipping';
      }

      if (coupon.discount_type === 'percentage') {
        discount_amount = Math.round((applicable_amount * coupon.discount_percentage) / 100);
      } else {
        discount_amount = Math.min(coupon.discount_amount, applicable_amount);
      }

      // Calculate final amounts
      let final_order_amount = order_amount;
      let final_shipping_cost = shipping_cost;

      if (coupon.type === 'shipping') {
        final_shipping_cost = Math.max(0, shipping_cost - discount_amount);
      } else {
        final_order_amount = Math.max(0, order_amount - discount_amount);
      }

      const final_total = final_order_amount + final_shipping_cost;

      // Increment usage count if not dry run
      if (!dry_run) {
        await trx('coupons')
          .where('id', coupon.id)
          .increment('usage_count', 1)
          .update('updated_at', knex.fn.now());
      }

      await trx.commit();

      // Prepare response data
      const discount_calculation = {
        original_amount: order_amount,
        original_shipping: shipping_cost,
        original_total: order_amount + shipping_cost,
        discount_amount: discount_amount,
        final_amount: final_order_amount,
        final_shipping: final_shipping_cost,
        final_total: final_total,
        savings: discount_amount,
        applicable_to: applicable_to
      };

      if (coupon.discount_type === 'percentage') {
        discount_calculation.discount_percentage = coupon.discount_percentage;
      }

      const validation = {
        is_valid: true,
        is_personal: coupon.user_id === user_id,
        is_regional: coupon.type === 'regional',
        is_shipping_discount: coupon.type === 'shipping',
        remaining_usage: coupon.usage_limit ? (coupon.usage_limit - coupon.usage_count - (dry_run ? 0 : 1)) : null,
        expires_at: coupon.valid_until,
        min_purchase: coupon.min_purchase
      };

      // Get coverage areas if regional
      let coverage_areas = [];
      if (coupon.type === 'regional') {
        const areas = await knex('coupon_coverage_areas')
          .where('coupon_id', coupon.id)
          .select('*');
        
        coverage_areas = areas.map(area => ({
          ...area,
          id: encryptId(area.id),
          coupon_id: encryptId(area.coupon_id)
        }));
      }

      // Prepare coupon data for response
      const couponResponse = {
        ...coupon,
        id: encryptId(coupon.id),
        user_id: coupon.user_id ? encryptId(coupon.user_id) : null,
        coverage_areas
      };

      res.status(200).json({
        status: 200,
        message: dry_run ? 'Coupon validated successfully' : 'Coupon applied successfully',
        data: {
          coupon: couponResponse,
          discount_calculation,
          validation,
          applied: !dry_run
        }
      });

    } catch (err) {
      await trx.rollback();
      console.error('applyCoupon error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(401).json({
          status: 401,
          message: 'Invalid authentication token',
          data: null
        });
      }

      res.status(500).json({
        status: 500,
        message: 'Internal server error',
        data: null
      });
    }
  }
};