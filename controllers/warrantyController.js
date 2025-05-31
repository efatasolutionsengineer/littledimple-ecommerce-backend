const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption.js');

/**
 * @swagger
 * components:
 *   schemas:
 *     Warranty_Tables:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted warranty ID
 *         produk_id:
 *           type: integer
 *         order_id:
 *           type: integer
 *         kode_warranty:
 *           type: string
 *         nama:
 *           type: string
 *         email:
 *           type: string
 *         nomor_hp:
 *           type: string
 *         alamat:
 *           type: string
 *         attachments_receipt:
 *           type: string
 *         attachments_barcode:
 *           type: string
 *         attachments_product:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [submitted, under_review, approved, rejected, completed]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "encrypted_id_string"
 *         produk_id: 1
 *         order_id: 123
 *         kode_warranty: "WR-2023-001"
 *         nama: "John Doe"
 *         email: "john@example.com"
 *         nomor_hp: "+628123456789"
 *         alamat: "Jl. Example No. 123"
 *         status: "submitted"
 *         created_at: "2023-01-01T00:00:00Z"
 *         updated_at: "2023-01-01T00:00:00Z"
 *     
 *     Warranty_Response:
 *       type: object
 *       properties:
 *         status:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           properties:
 *             warranties:
 *               type: array
 *               items: 
 *                 $ref: '#/components/schemas/Warranty_Tables'
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
   * /api/warranty:
   *   get:
   *     summary: Get all warranty data with pagination, filtering, sorting, and search (Admin only)
   *     tags: [Warranty]
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
   *           enum: [submitted, under_review, approved, rejected, completed]
   *         description: Filter by status
   *         example: submitted
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
   *         example: "john"
   *     responses:
   *       200:
   *         description: Warranties retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Warranty_Response'
   *       400:
   *         description: Bad request - invalid parameters
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       500:
   *         description: Internal server error
   */
  getAllWarranties: async (req, res) => {
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
          data: null
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

      // Build base query (only where nama, email, nomor_hp are not null)
      let baseQuery = knex('warranty')
        .whereNotNull('nama')
        .whereNotNull('email')
        .whereNotNull('nomor_hp');

      // Apply status filter
      if (status) {
        const validStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            status: 400,
            message: 'Invalid status. Must be: submitted, under_review, approved, rejected, completed',
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
          this.where('nama', 'ilike', `%${search}%`)
            .orWhere('email', 'ilike', `%${search}%`)
            .orWhere('nomor_hp', 'ilike', `%${search}%`)
            .orWhere('alamat', 'ilike', `%${search}%`)
            .orWhere('kode_warranty', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`)
            .orWhere('status', 'ilike', `%${search}%`);
        });
      }

      // Get total count
      const totalCount = await baseQuery.clone()
        .count('id as count')
        .first();

      const total = parseInt(totalCount.count);
      const totalPages = Math.ceil(total / limit);

      // Get warranty data with pagination and sorting
      const warrantyData = await baseQuery.clone()
        .select('*')
        .orderBy('id', 'desc') // Default order by id desc
        .orderBy('created_at', sort_order) // Then by created_at
        .limit(limit)
        .offset(offset);

      // Encrypt warranty IDs
      const warranties = warrantyData.map(warranty => ({
        ...warranty,
        id: encryptId(warranty.id)
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
        message: 'Warranties retrieved successfully',
        
          warranties,
          pagination,
          filters: appliedFilters
        }
      );

    } catch (err) {
      console.error('getAllWarranties error:', err);
      
      // Handle decryption errors specifically
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
  },

  /**
   * @swagger
   * /api/warranty/{id}:
   *   get:
   *     summary: Get warranty by ID (Admin only)
   *     tags: [Warranty]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Encrypted warranty ID
   *     responses:
   *       200:
   *         description: Warranty retrieved successfully
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
   *                   example: "Warranty retrieved successfully"
   *               $ref: '#/components/schemas/Warranty_Tables'
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden - Admin access required
   *       404:
   *         description: Warranty not found
   *       500:
   *         description: Internal server error
   */
  getWarrantyById: async (req, res) => {
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

      const warranty_id = decryptId(req.params.id);
      
      const warranty = await knex('warranty')
        .where('id', warranty_id)
        .whereNotNull('nama')
        .whereNotNull('email')
        .whereNotNull('nomor_hp')
        .first();

      if (!warranty) {
        return res.status(404).json({
          status: 404,
          message: 'Warranty not found',
          data: null
        });
      }

      // Encrypt warranty ID
      warranty.id = encryptId(warranty.id);

      res.status(200).json({
        status: 200,
        message: 'Warranty retrieved successfully',
        data: warranty
      });

    } catch (err) {
      console.error('getWarrantyById error:', err);
      
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
 * /api/warranty/{id}:
 *   delete:
 *     summary: Delete warranty (soft delete)
 *     tags: [Warranty]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Encrypted warranty ID
 *     responses:
 *       200:
 *         description: Warranty deleted successfully
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
 *                   example: "Warranty deleted successfully"
 *                 data:
 *                   type: null
 *       404:
 *         description: Warranty not found
 *       500:
 *         description: Internal server error
 */
  deleteWarranty: async (req, res) => {
    try {
      const warranty_id = decryptId(req.params.id);
      
      // Soft delete: update deleted_at and updated_at timestamps
      const deleted = await knex('warranty')
        .where('id', warranty_id)
        .whereNotNull('nama')
        .whereNotNull('email')
        .whereNotNull('nomor_hp')
        .whereNull('deleted_at') // Only delete if not already deleted
        .update({
          deleted_at: knex.fn.now(),
          updated_at: knex.fn.now()
        });

      if (!deleted) {
        return res.status(404).json({
          status: 404,
          message: 'Warranty not found or already deleted',
          });
      }

      res.status(200).json({
        status: 200,
        message: 'Warranty deleted successfully',
        data: null
      });

    } catch (err) {
      console.error('deleteWarranty error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid warranty ID format',
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
   * /api/warranty/{id}/status:
   *   put:
   *     summary: Update warranty status
   *     tags: [Warranty]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Encrypted warranty ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [submitted, under_review, approved, rejected, completed]
   *                 example: "under_review"
   *     responses:
   *       200:
   *         description: Warranty status updated successfully
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
   *                   example: "Warranty status updated successfully"
   *                 $ref: '#/components/schemas/Warranty_Tables'
   *       400:
   *         description: Bad request - invalid status
   *       404:
   *         description: Warranty not found
   *       500:
   *         description: Internal server error
   */
  updateWarrantyStatus: async (req, res) => {
    try {
      const warranty_id = decryptId(req.params.id);
      const { status } = req.body;

      // Validate status
      const validStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'completed'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid status. Must be: submitted, under_review, approved, rejected, completed',
          data: null
        });
      }

      // Update warranty status
      const updated = await knex('warranty')
        .where('id', warranty_id)
        .whereNotNull('nama')
        .whereNotNull('email')
        .whereNotNull('nomor_hp')
        .update({ 
          status: status,
          updated_at: new Date()
        })
        .returning('*');

      if (!updated.length) {
        return res.status(404).json({
          status: 404,
          message: 'Warranty not found',
          data: null
        });
      }

      // Encrypt warranty ID in response
      const warranty = { ...updated[0] };
      warranty.id = encryptId(warranty.id);

      res.status(200).json({
        status: 200,
        message: 'Warranty status updated successfully',
        data: warranty
      });

    } catch (err) {
      console.error('updateWarrantyStatus error:', err);
      
      if (err.message && err.message.includes('decrypt')) {
        return res.status(400).json({
          status: 400,
          message: 'Invalid warranty ID format',
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