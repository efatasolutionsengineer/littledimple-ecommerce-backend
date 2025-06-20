const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption.js');
const slugify = require('slugify');
const galleryController = require('./galleryController.js');

/**
 * @swagger
 * components:
 *   schemas:
 *     MediaGallery:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *         type:
 *           type: string
 *           enum: [image, video]
 *         image_small:
 *           type: string
 *           description: URL to small version of the image
 *         image_medium:
 *           type: string
 *           description: URL to medium version of the image
 *         image_high:
 *           type: string
 *           description: URL to high resolution version of the image
 *         image_original:
 *           type: string
 *           description: URL to original image
 *         video_link:
 *           type: string
 *           description: URL to video (if type is video)
 *
 *     ProductImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted product image ID
 *         product_id:
 *           type: string
 *           description: Encrypted product ID
 *         media_id:
 *           type: string
 *           description: Media ID
 *         category:
 *           type: string
 *           description: Image category (e.g., main, thumbnail)
 *           example: main
 *         is_main:
 *           type: boolean
 *           description: Whether this is the main product image
 *         media:
 *           $ref: '#/components/schemas/MediaGallery'
 *
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted product ID
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         stock:
 *           type: integer
 *         category_id:
 *           type: string
 *           description: Encrypted category ID
 *         category_name:
 *           type: string
 *         image_url:
 *           type: string
 *           description: Legacy image URL (may be deprecated)
 *         images:
 *           type: array
 *           description: Product images from product_images table
 *           items:
 *             $ref: '#/components/schemas/ProductImage'
 *         main_image:
 *           $ref: '#/components/schemas/MediaGallery'
 *           description: The main product image
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
 *
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
 *           type: string
 *           description: Encrypted category ID
 *         image_url:
 *           type: string
 *         discount_percentage:
 *           type: number
 *         discount_duration_days:
 *           type: integer
 */

/**
 * Helper function to get product images with media information
 * @param {number} productId - Decrypted product ID
 * @returns {Array} - Array of product images with media information
 */
async function getProductImages(productId) {
    try {
        // Get product images with media info
        const productImages = await knex('product_images as pi')
            .leftJoin('media_gallery as mg', 'pi.media_id', 'mg.id')
            .where('pi.product_id', productId)
            .whereNull('pi.deleted_at')
            .select(
                'pi.id',
                'pi.product_id',
                'pi.media_id',
                'pi.category',
                'pi.is_main',
                'mg.title',
                'mg.type',
                'mg.image_small',
                'mg.image_medium',
                'mg.image_high',
                'mg.image_original',
                'mg.video_link'
            )
            .orderBy('pi.is_main', 'desc'); // Main images first
        
        // Process and encrypt IDs
        return productImages.map(image => ({
            id: encryptId(image.id),
            product_id: encryptId(image.product_id),
            media_id: image.media_id,
            category: image.category,
            is_main: image.is_main,
            media: {
                title: image.title,
                type: image.type,
                image_small: galleryController.generateMediaProxyUrl(image.image_small),
                image_medium: galleryController.generateMediaProxyUrl(image.image_medium),
                image_high: galleryController.generateMediaProxyUrl(image.image_high),
                image_original: galleryController.generateMediaProxyUrl(image.image_original),
                video_link: galleryController.generateMediaProxyUrl(image.video_link)
            }
        }));
    } catch (err) {
        console.error('Error fetching product images:', err);
        return [];
    }
}

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
     *           type: string
     *         description: Filter by encrypted category ID
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
     *                 status:
     *                   type: integer
     *                   example: 200
     *                 message:
     *                   type: string
     *                   example: Products retrieved successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     products:
     *                       type: array
     *                       items:
     *                         $ref: '#/components/schemas/Product'
     *                     pagination:
     *                       type: object
     *                       properties:
     *                         total:
     *                           type: integer
     *                         per_page:
     *                           type: integer
     *                         current_page:
     *                           type: integer
     *                         last_page:
     *                           type: integer
     *                         from:
     *                           type: integer
     *                         to:
     *                           type: integer
     *       400:
     *         description: Bad request
     *       500:
     *         description: Server error
     */
    getAll: async (req, res) => {
        try {
            // Parse query params with defaults
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const keyword = req.query.keyword || null;
            const sortBy = req.query.sort_by || 'newest';
            const offset = (page - 1) * limit;
            
            // Safely handle category param
            let categoryId = null;
            if (req.query.category) {
                try {
                    // If the category is provided as an encrypted ID
                    categoryId = decryptId(req.query.category);
                } catch (decryptError) {
                    console.warn('Category decryption failed, using raw value:', decryptError.message);
                    
                    // Check if it's a valid number
                    const parsedCategory = parseInt(req.query.category, 10);
                    if (!isNaN(parsedCategory)) {
                        categoryId = parsedCategory;
                    } else {
                        // If not a valid number, just ignore the filter
                        console.warn('Invalid category ID provided');
                    }
                }
            }
            
            // Build the base query
            let baseQuery = knex('products')
                .join('categories', 'products.category_id', 'categories.id')
                .whereNull('products.deleted_at');
            
            // Filter by category_id if successfully parsed
            if (categoryId !== null) {
                baseQuery = baseQuery.where('products.category_id', categoryId);
            }
            
            // Filter by keyword in name or description if provided
            if (keyword) {
                baseQuery = baseQuery.andWhere(function () {
                    this.where('products.name', 'ilike', `%${keyword}%`)
                    .orWhere('products.description', 'ilike', `%${keyword}%`);
                });
            }
            
            // Count total records for pagination metadata - this is a separate query now
            const countQuery = baseQuery.clone().count('* as total').first();
            
            // Main query for fetching products
            let productQuery = baseQuery.clone()
                .select(
                    'products.*',
                    'categories.name as category_name'
                );
            
            // Sorting logic
            switch (sortBy) {
                case 'popular':
                    productQuery = productQuery.orderBy('products.rating', 'desc');
                    break;
                case 'newest':
                    productQuery = productQuery.orderBy('products.created_at', 'desc');
                    break;
                case 'price_asc':
                    productQuery = productQuery.orderBy('products.price', 'asc');
                    break;
                case 'price_desc':
                    productQuery = productQuery.orderBy('products.price', 'desc');
                    break;
                default:
                    productQuery = productQuery.orderBy('products.created_at', 'desc'); // default to newest
                    break;
            }
            
            // Apply pagination
            productQuery = productQuery.limit(limit).offset(offset);
            
            // Execute both queries concurrently
            const [totalResult, productsData] = await Promise.all([
                countQuery,
                productQuery
            ]);
            
            const total = parseInt(totalResult.total);
            
            // Process products and fetch images for each
            const products = [];
            for (const product of productsData) {
                try {
                    // Get product images
                    const images = await getProductImages(product.id);
                    
                    // Find main image (or first image if no main image exists)
                    let mainImage = images.find(img => img.is_main) || (images.length > 0 ? images[0] : null);
                    
                    // Encrypt IDs and add images
                    products.push({
                        ...product,
                        id: encryptId(product.id),
                        category_id: product.category_id ? encryptId(product.category_id) : null,
                        images: images,
                        main_image: mainImage ? mainImage.media : null
                    });
                } catch (encryptError) {
                    console.error('Error processing product:', encryptError);
                    products.push({
                        ...product,
                        id: `error_encrypting_${product.id}`,
                        encryption_error: true
                    });
                }
            }
            
            // Calculate pagination metadata
            const totalPages = Math.ceil(total / limit);
            
            res.status(200).json({
                status: 200,
                message: 'Products retrieved successfully',
                data: {
                    products,
                    pagination: {
                        total,
                        per_page: limit,
                        current_page: page,
                        last_page: totalPages,
                        from: offset + 1,
                        to: Math.min(offset + limit, total)
                    }
                }
            });
        } catch (err) {
            console.error('getAll products error:', err);
            res.status(500).json({
                status: 500,
                message: 'Error retrieving products',
                error: err.message
            });
        }
    },
 
    /**
     * @swagger
     * /api/products/hot:
     *   get:
     *     summary: Get all hot products with optional filtering and pagination
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
     *           type: string
     *         description: Filter by encrypted category ID
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
     *         description: Sort products by criteria
     *     responses:
     *       200:
     *         description: List of hot products with pagination
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
     *                   example: Hot products retrieved successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     products:
     *                       type: array
     *                       items:
     *                         $ref: '#/components/schemas/Product'
     *                     pagination:
     *                       type: object
     *                       properties:
     *                         total:
     *                           type: integer
     *                         per_page:
     *                           type: integer
     *                         current_page:
     *                           type: integer
     *                         last_page:
     *                           type: integer
     *                         from:
     *                           type: integer
     *                         to:
     *                           type: integer
     */
    getAllHot: async (req, res) => {
        try {
            // Parse query params with defaults
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const keyword = req.query.keyword || null;
            const sortBy = req.query.sort_by || 'newest';
            const offset = (page - 1) * limit;
            
            // Safely handle category param
            let categoryId = null;
            if (req.query.category) {
                try {
                    // If the category is provided as an encrypted ID
                    categoryId = decryptId(req.query.category);
                } catch (decryptError) {
                    console.warn('Category decryption failed:', decryptError.message);
                    const parsedCategory = parseInt(req.query.category, 10);
                    if (!isNaN(parsedCategory)) {
                        categoryId = parsedCategory;
                    }
                }
            }
            
            let query = knex('products')
            .join('categories', 'products.category_id', 'categories.id')
            .whereNull('products.deleted_at')
            .andWhere('products.label_1', 'hot')
            .select(
                'products.*',
                'categories.name as category_name'
            );
            
            // Filter by category_id if successfully parsed
            if (categoryId !== null) {
                query = query.where('products.category_id', categoryId);
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
                    query = query.orderBy('products.created_at', 'desc'); 
                    break;
            }
            
            // Count total records for pagination
            const countQuery = query.clone();
            const totalResult = await countQuery.count('products.id as total').first();
            const total = parseInt(totalResult.total);
            
            // Apply pagination
            query = query.limit(limit).offset(offset);
            const productsData = await query;
            
            // Process products and fetch images for each
            const products = [];
            for (const product of productsData) {
                // Get product images
                const images = await getProductImages(product.id);
                
                // Find main image (or first image if no main image exists)
                let mainImage = images.find(img => img.is_main) || (images.length > 0 ? images[0] : null);
                
                // Encrypt IDs and add images
                products.push({
                    ...product,
                    id: encryptId(product.id),
                    category_id: product.category_id ? encryptId(product.category_id) : null,
                    images: images,
                    main_image: mainImage ? mainImage.media : null
                });
            }
            
            // Calculate pagination metadata
            const totalPages = Math.ceil(total / limit);
            
            res.status(200).json({
                status: 200,
                message: 'Hot products retrieved successfully',
                data: {
                    products,
                    pagination: {
                        total,
                        per_page: limit,
                        current_page: page,
                        last_page: totalPages,
                        from: offset + 1,
                        to: Math.min(offset + limit, total)
                    }
                }
            });
        } catch (err) {
            console.error('getAllHot products error:', err);
            res.status(500).json({
                status: 500,
                message: 'Error retrieving hot products',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/products/new:
     *   get:
     *     summary: Get all new products with optional filtering and pagination
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
     *           type: string
     *         description: Filter by encrypted category ID
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
     *         description: Sort products by criteria
     *     responses:
     *       200:
     *         description: List of new products with pagination
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
     *                   example: New products retrieved successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     products:
     *                       type: array
     *                       items:
     *                         $ref: '#/components/schemas/Product'
     *                     pagination:
     *                       type: object
     *                       properties:
     *                         total:
     *                           type: integer
     *                         per_page:
     *                           type: integer
     *                         current_page:
     *                           type: integer
     *                         last_page:
     *                           type: integer
     *                         from:
     *                           type: integer
     *                         to:
     *                           type: integer
     */
    getAllNew: async (req, res) => {
        try {
            // Parse query params with defaults
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const keyword = req.query.keyword || null;
            const sortBy = req.query.sort_by || 'newest';
            const offset = (page - 1) * limit;
            
            // Safely handle category param
            let categoryId = null;
            if (req.query.category) {
                try {
                    // If the category is provided as an encrypted ID
                    categoryId = decryptId(req.query.category);
                } catch (decryptError) {
                    console.warn('Category decryption failed:', decryptError.message);
                    const parsedCategory = parseInt(req.query.category, 10);
                    if (!isNaN(parsedCategory)) {
                        categoryId = parsedCategory;
                    }
                }
            }
            
            let query = knex('products')
            .join('categories', 'products.category_id', 'categories.id')
            .whereNull('products.deleted_at')
            .andWhere('products.label_2', 'new')
            .select(
                'products.*',
                'categories.name as category_name'
            );
            
            // Filter by category_id if successfully parsed
            if (categoryId !== null) {
                query = query.where('products.category_id', categoryId);
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
                    query = query.orderBy('products.created_at', 'desc');
                    break;
            }
            
            // Count total records for pagination
            const countQuery = query.clone();
            const totalResult = await countQuery.count('products.id as total').first();
            const total = parseInt(totalResult.total);
            
            // Apply pagination
            query = query.limit(limit).offset(offset);
            const productsData = await query;
            
            // Process products and fetch images for each
            const products = [];
            for (const product of productsData) {
                // Get product images
                const images = await getProductImages(product.id);
                
                // Find main image (or first image if no main image exists)
                let mainImage = images.find(img => img.is_main) || (images.length > 0 ? images[0] : null);
                
                // Encrypt IDs and add images
                products.push({
                    ...product,
                    id: encryptId(product.id),
                    category_id: product.category_id ? encryptId(product.category_id) : null,
                    images: images,
                    main_image: mainImage ? mainImage.media : null
                });
            }
            
            // Calculate pagination metadata
            const totalPages = Math.ceil(total / limit);
            
            res.status(200).json({
                status: 200,
                message: 'New products retrieved successfully',
                    products,
                    pagination: {
                        total,
                        per_page: limit,
                        current_page: page,
                        last_page: totalPages,
                        from: offset + 1,
                        to: Math.min(offset + limit, total)
                    }
            });
        } catch (err) {
            console.error('getAllNew products error:', err);
            res.status(500).json({
                status: 500,
                message: 'Error retrieving new products',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/products/id/{id}:
     *   get:
     *     summary: Get product by ID with images
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted product ID
     *     responses:
     *       200:
     *         description: Product found
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
     *                   example: Product retrieved successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     product:
     *                       $ref: '#/components/schemas/Product'
     *       400:
     *         description: Invalid product ID format
     *       404:
     *         description: Product not found
     */
    getById: async (req, res) => {
        try {
            const { id } = req.params;
            let productId;
            
            try {
                productId = decryptId(id);
            } catch (decryptError) {
                return res.status(400).json({ 
                    status: 400,
                    message: 'Invalid product ID format',
                    error: decryptError.message
                });
            }

            const product = await knex('products')
                .join('categories', 'products.category_id', 'categories.id')
                .select(
                    'products.*',
                    'categories.name as category_name'
                )
                .where('products.id', productId)
                .whereNull('products.deleted_at')
                .first();

            if (!product) {
                return res.status(404).json({ 
                    status: 404,
                    message: 'Product not found'
                });
            }

            // Get product images
            const images = await getProductImages(productId);
            
            // Find main image (or first image if no main image exists)
            let mainImage = images.find(img => img.is_main) || (images.length > 0 ? images[0] : null);

            // Encrypt IDs for response
            const processedProduct = {
                ...product,
                id: encryptId(product.id),
                media_more_info: JSON.parse(product.media_more_info),
                category_id: product.category_id ? encryptId(product.category_id) : null,
                images: images,
                main_image: mainImage ? mainImage.media : null
            };

            res.status(200).json({
                status: 200,
                message: 'Product retrieved successfully',
                data: {
                    product: processedProduct
                }
            });
        } catch (err) {
            console.error('getById product error:', err);
            res.status(500).json({
                status: 500,
                message: 'Error retrieving product',
                error: err.message
            });
        }
    },

    /**
     * Internal helper method to get product by ID with images
     */
    async ProductGetById(id) {
        try {
            let productId;
            
            try {
                productId = decryptId(id);
            } catch (decryptError) {
                console.error('Invalid product ID format:', decryptError);
                return null;
            }
            
            const product = await knex('products')
                .join('categories', 'products.category_id', 'categories.id')
                .select(
                    'products.*',
                    'categories.name as category_name'
                )
                .where('products.id', productId)
                .whereNull('products.deleted_at')
                .first();

            if (!product) {
                return null;
            }
            
            // Get product images
            const images = await getProductImages(productId);
            
            // Find main image
            let mainImage = images.find(img => img.is_main) || (images.length > 0 ? images[0] : null);

            // Encrypt IDs and add images
            return {
                ...product,
                id: encryptId(product.id),
                category_id: product.category_id ? encryptId(product.category_id) : null,
                images: images,
                main_image: mainImage ? mainImage.media : null
            };
        } catch (err) {
            console.error('ProductGetById error:', err);
            throw err;
        }
    },

    /**
     * @swagger
     * /api/products/slug/{slug}:
     *   get:
     *     summary: Get product by Slug with images
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
     *                 status:
     *                   type: integer
     *                   example: 200
     *                 message:
     *                   type: string
     *                   example: Product retrieved successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     product:
     *                       $ref: '#/components/schemas/Product'
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
    
            if (!product) {
                return res.status(404).json({
                    status: 404,
                    message: 'Product not found'
                });
            }
            
            // Get product images
            const images = await getProductImages(product.id);
            
            // Find main image (or first image if no main image exists)
            let mainImage = images.find(img => img.is_main) || (images.length > 0 ? images[0] : null);
            
            // Encrypt IDs for response
            const processedProduct = {
                ...product,
                id: encryptId(product.id),
                category_id: product.category_id ? encryptId(product.category_id) : null,
                images: images,
                main_image: mainImage ? mainImage.media : null
            };

            res.status(200).json({
                status: 200,
                message: 'Product retrieved successfully',
                data: {
                    product: processedProduct
                }
            });
        } catch (err) {
            console.error('getBySlug product error:', err);
            res.status(500).json({
                status: 500,
                message: 'Error retrieving product',
                error: err.message
            });
        }
    },
    
    /**
     * Internal helper method to get product by slug with images
     */
    async ProductGetBySlug(slug) {
        try {
            const product = await knex('products')
                .join('categories', 'products.category_id', 'categories.id')
                .select('products.*', 'categories.name as category_name')
                .where('products.slug', slug)
                .whereNull('products.deleted_at')
                .first();
    
            if (!product) {
                return null;
            }
            
            // Get product images
            const images = await getProductImages(product.id);
            
            // Find main image
            let mainImage = images.find(img => img.is_main) || (images.length > 0 ? images[0] : null);

            // Encrypt IDs and add images
            return {
                ...product,
                id: encryptId(product.id),
                category_id: product.category_id ? encryptId(product.category_id) : null,
                images: images,
                main_image: mainImage ? mainImage.media : null
            };
        } catch (err) {
            console.error('ProductGetBySlug error:', err);
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
     *                 status:
     *                   type: integer
     *                   example: 201
     *                 message:
     *                   type: string
     *                   example: Product created successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     product:
     *                       $ref: '#/components/schemas/Product'
     */
    create: async (req, res) => {
        try {
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
            
            // Decrypt category_id
            let decryptedCategoryId;
            try {
                decryptedCategoryId = decryptId(category_id);
            } catch (decryptError) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid category ID format',
                    error: decryptError.message
                });
            }
            
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
                    category_id: decryptedCategoryId,
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
                
            // Encrypt IDs for response
            const processedProduct = {
                ...product,
                id: encryptId(product.id),
                category_id: encryptId(decryptedCategoryId),
                images: [],  // New product doesn't have images yet
                main_image: null
            };
                
            res.status(201).json({
                status: 201,
                message: 'Product created successfully',
                data: {
                    product: processedProduct
                }
            });
        } catch (err) {
            console.error('Create product error:', err);
            res.status(500).json({
                status: 500,
                message: 'Error creating product',
                error: err.message
            });
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
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted product ID
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
     *                 status:
     *                   type: integer
     *                   example: 200
     *                 message:
     *                   type: string
     *                   example: Product updated successfully
     *                 data:
     *                   type: object
     *                   properties:
     *                     product:
     *                       $ref: '#/components/schemas/Product'
     */
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const data = { ...req.body };
            
            // Decrypt product ID
            let productId;
            try {
                productId = decryptId(id);
            } catch (decryptError) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid product ID format',
                    error: decryptError.message
                });
            }
            
            // Check if product exists
            const productExists = await knex('products')
                .where('id', productId)
                .whereNull('deleted_at')
                .first();
                
            if (!productExists) {
                return res.status(404).json({
                    status: 404,
                    message: 'Product not found'
                });
            }
            
            // If name is provided, update slug
            if (data.name) {
                const newSlug = slugify(data.name, { lower: true, strict: true });
                // Check if new slug exists for another product
                const slugExists = await knex('products')
                    .where({ slug: newSlug })
                    .whereNot('id', productId)
                    .first();
                    
                data.slug = slugExists ? `${newSlug}-${Date.now()}` : newSlug;
            }
            
            // If category_id is provided, decrypt it
            if (data.category_id) {
                try {
                    data.category_id = decryptId(data.category_id);
                } catch (decryptError) {
                    return res.status(400).json({
                        status: 400,
                        message: 'Invalid category ID format',
                        error: decryptError.message
                    });
                }
            }
            
            // If discount_duration_days is provided, calculate expires_at
            if (data.discount_duration_days) {
                data.discount_expires_at = knex.raw(`CURRENT_TIMESTAMP + interval '? days'`, [data.discount_duration_days]);
                delete data.discount_duration_days; // Remove from the data object as it's not a DB column
            }
            
            // Update the product
            const [updatedProduct] = await knex('products')
                .where('id', productId)
                .update({
                    ...data,
                    updated_at: knex.fn.now()
                })
                .returning('*');
                
            // Get product images
            const images = await getProductImages(productId);
            
            // Find main image (or first image if no main image exists)
            let mainImage = images.find(img => img.is_main) || (images.length > 0 ? images[0] : null);
                
            // Get category name for response
            const category = await knex('categories')
                .where('id', updatedProduct.category_id)
                .select('name')
                .first();
                
            // Encrypt IDs for response
            const processedProduct = {
                ...updatedProduct,
                id: encryptId(updatedProduct.id),
                category_id: encryptId(updatedProduct.category_id),
                category_name: category ? category.name : null,
                images: images,
                main_image: mainImage ? mainImage.media : null
            };
                
            res.status(200).json({
                status: 200,
                message: 'Product updated successfully',
                data: {
                    product: processedProduct
                }
            });
        } catch (err) {
            console.error('Update product error:', err);
            res.status(500).json({
                status: 500,
                message: 'Error updating product',
                error: err.message
            });
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
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted product ID
     *     responses:
     *       200:
     *         description: Product soft-deleted successfully
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
     *                   example: Product soft-deleted successfully
     */
    remove: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Decrypt product ID
            let productId;
            try {
                productId = decryptId(id);
            } catch (decryptError) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid product ID format',
                    error: decryptError.message
                });
            }
            
            // Check if product exists
            const productExists = await knex('products')
                .where('id', productId)
                .whereNull('deleted_at')
                .first();
                
            if (!productExists) {
                return res.status(404).json({
                    status: 404,
                    message: 'Product not found or already deleted'
                });
            }
            
            // Soft delete the product
            await knex('products')
                .where('id', productId)
                .update({
                    deleted_at: knex.fn.now()
                });
                
            res.status(200).json({
                status: 200,
                message: 'Product soft-deleted successfully'
            });
        } catch (err) {
            console.error('Remove product error:', err);
            res.status(500).json({
                status: 500,
                message: 'Error deleting product',
                error: err.message
            });
        }
    }
};