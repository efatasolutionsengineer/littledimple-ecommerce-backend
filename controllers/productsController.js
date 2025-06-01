const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption.js');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         stock:
 *           type: integer
 *         category_id:
 *           type: integer
 *         category_name:
 *           type: string
 *         image_url:
 *           type: string
 *         discount_percentage:
 *           type: number
 *         discount_expires_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     ProductInput:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - stock
 *         - category_id
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         stock:
 *           type: integer
 *         category_id:
 *           type: integer
 *         image_url:
 *           type: string
 *         discount_percentage:
 *           type: number
 *         discount_duration_days:
 *           type: integer
 */

module.exports = {
    /**
     * @swagger
     * /api/products:
     *   get:
     *     summary: Get all products with optional filtering and pagination
     *     tags: [Products]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Page number for pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *         description: Number of products per page
     *       - in: query
     *         name: category
     *         schema:
     *           type: integer
     *         description: Filter by category ID
     *       - in: query
     *         name: keyword
     *         schema:
     *           type: string
     *         description: Keyword to search in product name or description
     *       - in: query
     *         name: sort_by
     *         schema:
     *           type: string
     *           enum: [popular, newest, price_asc, price_desc]
     *           default: newest
     *         description: Sort products by criteria popular (highest rating), newest (created_at), price_asc (low to high), price_desc (high to low)
     *     responses:
     *       200:
     *         description: List of products with pagination
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 products:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Product'
     *                 page:
     *                   type: integer
     *                   description: Current page number
     *                 limit:
     *                   type: integer
     *                   description: Number of products per page
     */
    getAll: async (req, res) => {
        try {
            // Parse query params with defaults
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const category = req.query.category || null;
            const keyword = req.query.keyword || null;
            const sortBy = req.query.sort_by || 'newest';

            const offset = (page - 1) * limit;

            let query = knex('products')
            .join('categories', 'products.category_id', 'categories.id')
            .whereNull('products.deleted_at')
            .select(
                'products.*',
                'categories.name as category_name'
            );

            // Filter by category_id if provided
            if (category) {
            query = query.where('products.category_id', category);
            }

            // Filter by keyword in name or description if provided
            if (keyword) {
            query = query.andWhere(function () {
                this.where('products.name', 'ilike', `%${keyword}%`)
                .orWhere('products.description', 'ilike', `%${keyword}%`);
            });
            }

            // Sorting logic
            switch (sortBy) {
            case 'popular':
                query = query.orderBy('products.rating', 'desc');
                break;
            case 'newest':
                query = query.orderBy('products.created_at', 'desc');
                break;
            case 'price_asc':
                query = query.orderBy('products.price', 'asc');
                break;
            case 'price_desc':
                query = query.orderBy('products.price', 'desc');
                break;
            default:
                query = query.orderBy('products.created_at', 'desc'); // default to newest
                break;
            }

            // Pagination
            query = query.limit(limit).offset(offset);

            const productsData = await query;

            // Encrypt warranty IDs
            const products = productsData.map(product => ({
                ...product,
                id: encryptId(product.id)
            }));

            res.json({ products, page, limit });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/products/hot:
     *   get:
     *     summary: Get all products with optional filtering and pagination
     *     tags: [Products]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Page number for pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *         description: Number of products per page
     *       - in: query
     *         name: category
     *         schema:
     *           type: integer
     *         description: Filter by category ID
     *       - in: query
     *         name: keyword
     *         schema:
     *           type: string
     *         description: Keyword to search in product name or description
     *       - in: query
     *         name: sort_by
     *         schema:
     *           type: string
     *           enum: [popular, newest, price_asc, price_desc]
     *           default: newest
     *         description: Sort products by criteria popular (highest rating), newest (created_at), price_asc (low to high), price_desc (high to low)
     *     responses:
     *       200:
     *         description: List of products with pagination
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 products:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Product'
     *                 page:
     *                   type: integer
     *                   description: Current page number
     *                 limit:
     *                   type: integer
     *                   description: Number of products per page
     */
    getAllHot: async (req, res) => {
        try {
            // Parse query params with defaults
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const category = req.query.category || null;
            const keyword = req.query.keyword || null;
            const sortBy = req.query.sort_by || 'newest';

            const offset = (page - 1) * limit;

            let query = knex('products')
            .join('categories', 'products.category_id', 'categories.id')
            .whereNull('products.deleted_at')
            .andWhere('products.label_1', 'hot')
            .select(
                'products.*',
                'categories.name as category_name'
            );

            // Filter by category_id if provided
            if (category) {
            query = query.where('products.category_id', category);
            }

            // Filter by keyword in name or description if provided
            if (keyword) {
            query = query.andWhere(function () {
                this.where('products.name', 'ilike', `%${keyword}%`)
                .orWhere('products.description', 'ilike', `%${keyword}%`);
            });
            }

            // Sorting logic
            switch (sortBy) {
            case 'popular':
                query = query.orderBy('products.rating', 'desc');
                break;
            case 'newest':
                query = query.orderBy('products.created_at', 'desc');
                break;
            case 'price_asc':
                query = query.orderBy('products.price', 'asc');
                break;
            case 'price_desc':
                query = query.orderBy('products.price', 'desc');
                break;
            default:
                query = query.orderBy('products.created_at', 'desc'); // default to newest
                break;
            }

            // Pagination
            query = query.limit(limit).offset(offset);

            const products = await query;

            res.json({ products, page, limit });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/products/new:
     *   get:
     *     summary: Get all products with optional filtering and pagination
     *     tags: [Products]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Page number for pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *         description: Number of products per page
     *       - in: query
     *         name: category
     *         schema:
     *           type: integer
     *         description: Filter by category ID
     *       - in: query
     *         name: keyword
     *         schema:
     *           type: string
     *         description: Keyword to search in product name or description
     *       - in: query
     *         name: sort_by
     *         schema:
     *           type: string
     *           enum: [popular, newest, price_asc, price_desc]
     *           default: newest
     *         description: Sort products by criteria popular (highest rating), newest (created_at), price_asc (low to high), price_desc (high to low)
     *     responses:
     *       200:
     *         description: List of products with pagination
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 products:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Product'
     *                 page:
     *                   type: integer
     *                   description: Current page number
     *                 limit:
     *                   type: integer
     *                   description: Number of products per page
     */
    getAllNew: async (req, res) => {
        try {
            // Parse query params with defaults
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const category = req.query.category || null;
            const keyword = req.query.keyword || null;
            const sortBy = req.query.sort_by || 'newest';

            const offset = (page - 1) * limit;

            let query = knex('products')
            .join('categories', 'products.category_id', 'categories.id')
            .whereNull('products.deleted_at')
            .andWhere('products.label_2', 'new')
            .select(
                'products.*',
                'categories.name as category_name'
            );
            

            // Filter by category_id if provided
            if (category) {
            query = query.where('products.category_id', category);
            }

            // Filter by keyword in name or description if provided
            if (keyword) {
            query = query.andWhere(function () {
                this.where('products.name', 'ilike', `%${keyword}%`)
                .orWhere('products.description', 'ilike', `%${keyword}%`);
            });
            }

            // Sorting logic
            switch (sortBy) {
            case 'popular':
                query = query.orderBy('products.rating', 'desc');
                break;
            case 'newest':
                query = query.orderBy('products.created_at', 'desc');
                break;
            case 'price_asc':
                query = query.orderBy('products.price', 'asc');
                break;
            case 'price_desc':
                query = query.orderBy('products.price', 'desc');
                break;
            default:
                query = query.orderBy('products.created_at', 'desc'); // default to newest
                break;
            }

            // Pagination
            query = query.limit(limit).offset(offset);

            const products = await query;

            res.json({ products, page, limit });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/products/id/{id}:
     *   get:
     *     summary: Get product by ID
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Product found
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 product:
     *                   $ref: '#/components/schemas/Product'
     *       400:
     *         description: Product not found
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            const product = await knex('products')
                .join('categories', 'products.category_id', 'categories.id')
                .select(
                'products.*',
                'categories.name as category_name'
                )
                .where('products.id', id)
                .whereNull('products.deleted_at')
                .first();


            if (!product) return res.status(404).json({ message: 'Product not found', product: product });
            res.json({ product });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    async ProductGetById(id){
        try {
            const product = await knex('products')
            .join('categories', 'products.category_id', 'categories.id')
            .select(
                'products.*',
                'categories.name as category_name'
            )
            .where('products.id', id)
            .whereNull('products.deleted_at')
            .first();
    
            if (!product) return res.status(404).json({ message: 'Product not found' });
            res.json({ product });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/products/slug/{slug}:
     *   get:
     *     summary: Get product by Slug
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: slug
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Product found
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 product:
     *                   $ref: '#/components/schemas/Product'
     *       404:
     *         description: Product not found
     */
    getBySlug: async (req, res) => {
        try {
          const product = await knex('products')
            .join('categories', 'products.category_id', 'categories.id')
            .select('products.*', 'categories.name as category_name')
            .where('products.slug', req.params.slug)
            .whereNull('products.deleted_at')
            .first();
    
          if (!product) return res.status(404).json({ message: 'Product not found' });
          res.json({ product });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
    },
    
    async ProductGetBySlug(slug) {
        try {
          const product = await knex('products')
            .join('categories', 'products.category_id', 'categories.id')
            .select('products.*', 'categories.name as category_name')
            .where('products.slug', slug)
            .whereNull('products.deleted_at')
            .first();
    
          return product;
        } catch (err) {
          throw err;
        }
    },

    /**
     * @swagger
     * /api/products:
     *   post:
     *     summary: Create a new product
     *     tags: [Products]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ProductInput'
     *     responses:
     *       201:
     *         description: Product created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 product:
     *                   $ref: '#/components/schemas/Product'
     */
    create: async (req, res) => {
        const {
            name,
            description,
            price,
            stock,
            category_id,
            image_url,
            discount_percentage,
            discount_duration_days,
            more_info,
            media_more_info,
            kode_produk,
            weight,
            size,
            label_1,
            label_2,
            rating
        } = req.body;

        try {
            const slug = slugify(name, { lower: true, strict: true });
            const slugExists = await knex('products').where({ slug }).first();
            const uniqueSlug = slugExists ? `${slug}-${Date.now()}` : slug;

            const discount_expires_at = discount_duration_days
                ? knex.raw(`CURRENT_TIMESTAMP + interval '? days'`, [discount_duration_days])
                : null;

            const [product] = await knex('products')
                .insert({
                    name,
                    slug: uniqueSlug,
                    description,
                    price,
                    stock,
                    category_id,
                    image_url,
                    discount_percentage,
                    discount_expires_at,
                    more_info,
                    media_more_info,
                    kode_produk,
                    weight,
                    size,
                    label_1,
                    label_2,
                    rating
                })
                .returning('*');

            res.status(201).json({ product });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/products/{id}:
     *   put:
     *     summary: Update a product by ID
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: slug
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ProductInput'
     *     responses:
     *       200:
     *         description: Product updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 product:
     *                   $ref: '#/components/schemas/Product'
     */
    update: async (req, res) => {
        const { slug } = req.params;
        const data = req.body;
        try {
            if (data.name) {
                const newSlug = slugify(data.name, { lower: true, strict: true });
                data.slug = newSlug;
            }

            const updated = await knex('products').where({ slug }).update(data).returning('*');
            res.json({ product: updated[0] });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/products/{id}:
     *   delete:
     *     summary: Soft delete a product by ID
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: slug
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Product soft-deleted successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     */
    remove: async (req, res) => {
        try {
        await knex('products')
            .where({ slug: req.params.slug })
            .update({ deleted_at: knex.fn.now() });
        res.json({ message: 'Product soft-deleted successfully' });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    }
};