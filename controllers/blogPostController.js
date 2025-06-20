const knex = require('../db/knex');
const dayjs = require('dayjs');
const slugify = require('slugify');
const { decryptId, encryptId } = require('../models/encryption');

/**
 * Menghasilkan slug dari judul dan memastikan slug tersebut unik.
 * @param {string} title - Judul artikel yang akan diubah menjadi slug.
 * @returns {string} - Slug yang sudah dibuat dari judul.
 */
const generateUniqueSlug = async (title) => {
    let slug = slugify(title, { 
        replacement: '-',  // mengganti spasi dengan -
        remove: /[*+~.()'"!:@]/g,  // menghapus karakter yang tidak diinginkan
        lower: true,  // menghasilkan slug dalam huruf kecil
        strict: true
    });
    let uniqueSlug = slug;
  
    // Memeriksa apakah slug sudah ada di database
    const existingPost = await knex('blog_posts')
      .where('slug', uniqueSlug)
      .first();
  
    // Jika slug sudah ada, tambahkan angka di akhir untuk menjadikannya unik
    let counter = 1;
    while (existingPost) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  
    return uniqueSlug;
};

/**
 * Fungsi untuk memeriksa apakah slug sudah ada di database
 * 
 * @param {string} slug - Slug yang akan diperiksa
 * @returns {boolean} - Mengembalikan true jika slug sudah ada, false jika tidak
 */
async function checkSlugExists(slug) {
    const existingSlug = await knex('blog_posts').where('slug', slug).first();
    return existingSlug !== undefined;
}


/**
 * @swagger
 * tags:
 *   name: BlogPosts
 *   description: Manajemen artikel/blog post
 */

const blogPostController = {
    /**
     * @swagger
     * /api/blog-posts:
     *   get:
     *     summary: Get all blog posts with pagination, sorting, and search
     *     tags: [BlogPosts]
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
     *         name: sort_by
     *         schema:
     *           type: string
     *           enum: [title, created_at, updated_at, author_id, category_id]
     *           default: created_at
     *         description: Sort by field
     *         example: "title"
     *       - in: query
     *         name: sort_order
     *         schema:
     *           type: string
     *           enum: [asc, desc]
     *           default: desc
     *         description: Sort order
     *         example: "desc"
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *         description: Search across title, content, and slug
     *         example: "technology"
     *       - in: query
     *         name: category_id
     *         schema:
     *           type: integer
     *         description: Filter by category ID
     *         example: 1
     *       - in: query
     *         name: author_id
     *         schema:
     *           type: integer
     *         description: Filter by author ID
     *         example: 1
     *     responses:
     *       200:
     *         description: Blog posts retrieved successfully
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
     *                   example: "Blog posts retrieved successfully"
     *                 data:
     *                   type: object
     *                   properties:
     *                     blog_posts:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           id:
     *                             type: string
     *                             description: Encrypted blog post ID
     *                             example: "encrypted_blog_id"
     *                           title:
     *                             type: string
     *                             example: "How to Build a REST API"
     *                           slug:
     *                             type: string
     *                             example: "how-to-build-rest-api"
     *                           content:
     *                             type: string
     *                             example: "In this comprehensive guide, we will explore..."
     *                           image_main_url:
     *                             type: string
     *                             nullable: true
     *                             example: "https://example.com/images/main.jpg"
     *                           image_thumbnail_url:
     *                             type: string
     *                             nullable: true
     *                             example: "https://example.com/images/thumb.jpg"
     *                           image_banner_url:
     *                             type: string
     *                             nullable: true
     *                             example: "https://example.com/images/banner.jpg"
     *                           image_meta_url:
     *                             type: string
     *                             nullable: true
     *                             example: "https://example.com/images/meta.jpg"
     *                           category_id:
     *                             type: string
     *                             nullable: true
     *                             description: Encrypted category ID
     *                             example: "encrypted_category_id"
     *                           author_id:
     *                             type: string
     *                             nullable: true
     *                             description: Encrypted author ID
     *                             example: "encrypted_author_id"
     *                           category_name:
     *                             type: string
     *                             nullable: true
     *                             example: "Technology"
     *                           author_name:
     *                             type: string
     *                             nullable: true
     *                             example: "John Doe"
     *                           created_at:
     *                             type: string
     *                             format: date-time
     *                             example: "2023-11-15T10:30:00Z"
     *                           updated_at:
     *                             type: string
     *                             format: date-time
     *                             example: "2023-11-15T10:30:00Z"
     *                     pagination:
     *                       type: object
     *                       properties:
     *                         current_page:
     *                           type: integer
     *                           example: 1
     *                         per_page:
     *                           type: integer
     *                           example: 10
     *                         total:
     *                           type: integer
     *                           example: 50
     *                         total_pages:
     *                           type: integer
     *                           example: 5
     *                         has_next:
     *                           type: boolean
     *                           example: true
     *                         has_prev:
     *                           type: boolean
     *                           example: false
     *                     filters:
     *                       type: object
     *                       properties:
     *                         sort_by:
     *                           type: string
     *                           example: "created_at"
     *                         sort_order:
     *                           type: string
     *                           example: "desc"
     *                         search:
     *                           type: string
     *                           nullable: true
     *                           example: "technology"
     *                         category_id:
     *                           type: integer
     *                           nullable: true
     *                           example: 1
     *                         author_id:
     *                           type: integer
     *                           nullable: true
     *                           example: 1
     *       400:
     *         description: Bad request - invalid parameters
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 400
     *                 message:
     *                   type: string
     *                   example: "Invalid sort_by field or sort_order"
     *                 data:
     *                   type: null
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 500
     *                 message:
     *                   type: string
     *                   example: "Internal server error"
     *                 error:
     *                   type: string
     *                   example: "Database connection failed"
     */
    getAllAdmin: async (req, res) => {
        try {
            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            // Sorting parameters
            const sort_by = req.query.sort_by || 'created_at';
            const sort_order = req.query.sort_order || 'desc';

            // Filter parameters
            const search = req.query.search;
            const category_id = decryptId(req.query.category_id);
            const author_id = decryptId(req.query.author_id);

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

            // Validate sort parameters
            const validSortFields = ['title', 'created_at', 'updated_at', 'author_id', 'category_id'];
            const validSortOrders = ['asc', 'desc'];

            if (!validSortFields.includes(sort_by)) {
                return res.status(400).json({
                    status: 400,
                    message: `Invalid sort by field. Must be one of: ${validSortFields.join(', ')}`,
                    data: null
                });
            }

            if (!validSortOrders.includes(sort_order)) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid sort order. Must be: asc or desc',
                    data: null
                });
            }

            // Build base query with joins for category and author names
            let baseQuery = knex('blog_posts as bp')
                .leftJoin('categories as c', 'bp.category_id', 'c.id')
                .leftJoin('users as u', 'bp.author_id', 'u.id')
                .whereNull('bp.deleted_at');

            // Apply search filter
            if (search) {
                baseQuery = baseQuery.where(function() {
                    this.where('bp.title', 'ilike', `%${search}%`)
                        .orWhere('bp.content', 'ilike', `%${search}%`)
                        .orWhere('bp.slug', 'ilike', `%${search}%`);
                });
            }

            // Apply category filter
            if (category_id) {
                baseQuery = baseQuery.where('bp.category_id', category_id);
            }

            // Apply author filter
            if (author_id) {
                baseQuery = baseQuery.where('bp.author_id', author_id);
            }

            // Get total count for pagination
            const totalCount = await baseQuery.clone()
                .count('bp.id as count')
                .first();

            const total = parseInt(totalCount.count);
            const totalPages = Math.ceil(total / limit);

            // Get blog posts with pagination and sorting
            const blogPosts = await baseQuery.clone()
                .select(
                    'bp.*',
                    'c.name as category_name',
                    'u.full_name as author_name'
                )
                .orderBy('bp.id', 'desc') // Default order by id desc
                .orderBy(`bp.${sort_by}`, sort_order) // Then by specified field
                .limit(limit)
                .offset(offset);

            // Process and encrypt IDs
            const processedPosts = blogPosts.map(post => ({
                id: encryptId(post.id),
                title: post.title,
                slug: post.slug,
                content: post.content,
                image_main_url: post.image_main_url,
                image_thumbnail_url: post.image_thumbnail_url,
                image_banner_url: post.image_banner_url,
                image_meta_url: post.image_meta_url,
                category_id: post.category_id ? encryptId(post.category_id) : null,
                author_id: post.author_id ? encryptId(post.author_id) : null,
                category_name: post.category_name,
                author_name: post.author_name,
                created_at: post.created_at,
                updated_at: post.updated_at
            }));

            // Pagination metadata
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
                sort_by: sort_by,
                sort_order: sort_order,
                search: search || null,
                category_id: category_id || null,
                author_id: author_id || null
            };

            res.status(200).json({
                status: 200,
                message: 'Blog posts retrieved successfully',
                
                    blog_posts: processedPosts,
                    pagination: pagination,
                    filters: appliedFilters
            });
        } catch (err) {
            console.error('getAll blog posts error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/blog-posts/lists:
     *   get:
     *     summary: Get all blog posts with optional filtering and pagination
     *     tags: [Blog Posts]
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
     *         description: Number of blog posts per page
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *         description: Filter by category
     *       - in: query
     *         name: keyword
     *         schema:
     *           type: string
     *         description: Search keyword in title or content
     *     responses:
     *       200:
     *         description: List of blog posts
     *       500:
     *         description: Server error
     */
    getAll: async (req, res) => {
        try {
            // Parse query params with defaults
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10;
            const category = req.query.category || null;
            const keyword = req.query.keyword || null;
            const offset = (page - 1) * limit;

            // Build base query
            let query = knex('blog_posts')
                .whereNull('deleted_at')
                .orderBy('created_at', 'desc');

            // Apply filters if provided
            if (category) {
                query = query.where('category', category);
            }

            if (keyword) {
                query = query.andWhere(function() {
                    this.where('title', 'ilike', `%${keyword}%`)
                        .orWhere('content', 'ilike', `%${keyword}%`);
                });
            }

            // Clone query for counting total records
            const countQuery = query.clone();
            const totalResult = await countQuery.count('id as total').first();
            const total = parseInt(totalResult.total);

            // Apply pagination to main query
            query = query.limit(limit).offset(offset);
            
            // Execute the query
            const blogPosts = await query;

            // Process the results - safely encrypt IDs
            const processedPosts = [];
            
            for (const post of blogPosts) {
                try {
                    // Ensure post.id exists before encrypting
                    if (post.id !== null && post.id !== undefined) {
                        processedPosts.push({
                            ...post,
                            id: encryptId(post.id)
                        });
                    } else {
                        // Handle posts with missing IDs
                        console.warn('Blog post with missing ID found');
                        processedPosts.push({
                            ...post,
                            id: null,
                            id_error: 'Missing ID in database record'
                        });
                    }
                } catch (error) {
                    console.error(`Error processing blog post ID ${post.id}:`, error);
                    // Still include the post but with an error flag
                    processedPosts.push({
                        ...post,
                        id: `error_${post.id}`,
                        id_error: error.message
                    });
                }
            }

            // Calculate pagination metadata
            const totalPages = Math.ceil(total / limit);
            
            // Send successful response
            res.status(200).json({
                status: 200,
                message: 'Blog posts retrieved successfully',
                data: {
                    blog_posts: processedPosts,
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
            console.error('getAll blog posts error:', err);
            
            // Send error response
            res.status(500).json({
                status: 500,
                message: 'Error retrieving blog posts',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/blog-posts:
     *   post:
     *     summary: Menambahkan artikel blog baru dengan validasi slug unik
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *                 example: "Cara Membuat Aplikasi React"
     *               content:
     *                 type: string
     *                 example: "Ini adalah contoh artikel yang membahas cara membuat aplikasi menggunakan React."
     *               category_id:
     *                 type: integer
     *                 example: 1
     *               author_id:
     *                 type: integer
     *                 example: 1
     *               image_main_url:
     *                 type: string
     *               image_thumbnail_url:
     *                 type: string
     *               image_banner_url:
     *                 type: string
     *               image_meta_url:
     *                 type: string
     *     responses:
     *       201:
     *         description: Artikel berhasil ditambahkan
     *       400:
     *         description: Slug sudah digunakan
     */
    create: async (req, res) => {
        try {
        const { title, content, category_id, author_id, image_main_url, image_thumbnail_url, image_banner_url, image_meta_url } = req.body;
    
        // Generate slug dari judul artikel
        const slug = generateUniqueSlug(title);
    
        // Validasi apakah slug sudah ada di database
        const isSlugExist = await checkSlugExists(slug);
        if (isSlugExist) {
            return res.status(400).json({ message: 'Slug sudah digunakan, silakan ubah judul artikel.' });
        }
    
        const newPost = await knex('blog_posts').insert({
            title,
            slug,  // Simpan slug yang telah digenerate
            content,
            category_id,
            author_id,
            image_main_url,
            image_thumbnail_url,
            image_banner_url,
            image_meta_url,
        });
    
        res.status(201).json({
            message: 'Artikel berhasil ditambahkan',
            post: {
            id: newPost[0],  // ID artikel yang baru ditambahkan
            title,
            slug,
            content,
            category_id,
            author_id,
            },
        });
        } catch (error) {
        res.status(500).json({ message: 'Gagal menambahkan artikel', error: error.message });
        }
    },
    
    /**
     * @swagger
     * /api/blog-posts/{id}:
     *   put:
     *     summary: Memperbarui artikel blog dengan validasi slug unik
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *           example: 1
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *                 example: "Cara Membuat Aplikasi React"
     *               content:
     *                 type: string
     *                 example: "Ini adalah contoh artikel yang membahas cara membuat aplikasi menggunakan React."
     *               category_id:
     *                 type: integer
     *                 example: 1
     *               author_id:
     *                 type: integer
     *                 example: 1
     *               image_main_url:
     *                 type: string
     *               image_thumbnail_url:
     *                 type: string
     *               image_banner_url:
     *                 type: string
     *               image_meta_url:
     *                 type: string
     *     responses:
     *       200:
     *         description: Artikel berhasil diperbarui
     *       400:
     *         description: Slug sudah digunakan
     */
    update: async (req, res) => {
        try {
        const { title, content, category_id, author_id, image_main_url, image_thumbnail_url, image_banner_url, image_meta_url } = req.body;
        const { id } = req.params;
    
        // Generate slug dari judul artikel
        const slug = generateSlug(title);
    
        // Validasi apakah slug sudah ada di database untuk artikel lain
        const isSlugExist = await checkSlugExists(slug);
        if (isSlugExist) {
            return res.status(400).json({ message: 'Slug sudah digunakan, silakan ubah judul artikel.' });
        }
    
        const updatedPost = await knex('blog_posts')
            .where('id', decryptId(id))
            .update({
            title,
            slug,  // Simpan slug yang telah digenerate
            content,
            category_id,
            author_id,
            image_main_url,
            image_thumbnail_url,
            image_banner_url,
            image_meta_url,
            });
    
        res.status(200).json({
            message: 'Artikel berhasil diperbarui',
            post: {
            id,
            title,
            slug,
            content,
            category_id,
            author_id,
            },
        });
        } catch (error) {
        res.status(500).json({ message: 'Gagal memperbarui artikel', error: error.message });
        }
    },

    /**
     * @swagger
     * /api/blog-posts/{id}:
     *   delete:
     *     summary: Hapus blog post (soft delete)
     *     tags: [BlogPosts]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Blog post berhasil dihapus
     */
    delete: async (req, res) => {
        const { id } = req.params;
        try {
        await knex('blog_posts')
            .where({ id: decryptId(id) })
            .update({
            status_publish: 'deleted',
            deleted_at: knex.fn.now(),
            });
        res.json({ message: 'Blog post berhasil dihapus' });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    // /**
    //  * @swagger
    //  * /api/blog-posts/{postId}/tags:
    //  *   post:
    //  *     summary: Menambahkan tag ke artikel
    //  *     tags: [Blog Posts]
    //  *     security:
    //  *       - cookieAuth: []
    //  *     parameters:
    //  *       - in: path
    //  *         name: postId
    //  *         schema:
    //  *           type: integer
    //  *         required: true
    //  *         description: ID artikel
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             properties:
    //  *               tagIds:
    //  *                 type: array
    //  *                 items:
    //  *                   type: integer
    //  *     responses:
    //  *       200:
    //  *         description: Tag berhasil ditambahkan ke artikel
    //  */
    // assignTagsToPost: async (req, res) => {
    //     const { postId } = req.params;
    //     const { tagIds } = req.body;
    
    //     try {
    //     // Hapus dulu semua relasi tag sebelumnya
    //     await knex('blog_post_tags').where({ post_id: postId }).del();
    
    //     const data = tagIds.map(tagId => ({
    //         post_id: postId,
    //         tag_id: tagId
    //     }));
    
    //     await knex('blog_post_tags').insert(data);
    
    //     res.json({ message: 'Tag berhasil diperbarui untuk artikel' });
    //     } catch (error) {
    //     res.status(500).json({ message: error.message });
    //     }
    // },
  
    // /**
    // * @swagger
    // * /api/blog-posts/{postId}/tags:
    // *   get:
    // *     summary: Mendapatkan semua tag dari sebuah artikel
    // *     tags: [Blog Posts]
    // *     parameters:
    // *       - in: path
    // *         name: postId
    // *         schema:
    // *           type: integer
    // *         required: true
    // *         description: ID artikel
    // *     responses:
    // *       200:
    // *         description: Daftar tag
    // */
    // getTagsByPost: async (req, res) => {
    // const { postId } = req.params;
    // try {
    //     const tags = await knex('blog_post_tags')
    //     .join('blog_tags', 'blog_post_tags.tag_id', '=', 'blog_tags.id')
    //     .select('blog_tags.id', 'blog_tags.name')
    //     .where('blog_post_tags.post_id', postId)
    //     .whereNull('blog_tags.deleted_at');

    //     res.json(tags);
    // } catch (err) {
    //     res.status(500).json({ message: err.message });
    // }
    // },

    // /**
    //  * @swagger
    //  * /api/blog-posts/{postId}/comments:
    //  *   post:
    //  *     summary: Menambahkan komentar ke artikel
    //  *     tags: [Blog Posts]
    //  *     security:
    //  *       - cookieAuth: []
    //  *     parameters:
    //  *       - in: path
    //  *         name: postId
    //  *         schema:
    //  *           type: integer
    //  *         required: true
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             properties:
    //  *               comment:
    //  *                 type: string
    //  *     responses:
    //  *       200:
    //  *         description: Komentar berhasil ditambahkan
    //  */
    // addComment: async (req, res) => {
    //     const { postId } = req.params;
    //     const { comment } = req.body;
    //     const userId = req.user.id;
    
    //     try {
    //     await knex('blog_comments').insert({ post_id: postId, user_id: userId, comment });
    //     res.json({ message: 'Komentar berhasil ditambahkan' });
    //     } catch (error) {
    //     res.status(500).json({ message: error.message });
    //     }
    // },
  
    // /**
    //  * @swagger
    //  * /api/blog-posts/{postId}/comments:
    //  *   get:
    //  *     summary: Mendapatkan komentar dari artikel
    //  *     tags: [Blog Posts]
    //  *     parameters:
    //  *       - in: path
    //  *         name: postId
    //  *         schema:
    //  *           type: integer
    //  *         required: true
    //  *     responses:
    //  *       200:
    //  *         description: Daftar komentar
    //  */
    // getComments: async (req, res) => {
    //     const { postId } = req.params;
    
    //     try {
    //     const comments = await knex('blog_comments')
    //         .join('users', 'blog_comments.user_id', '=', 'users.id')
    //         .select('blog_comments.id', 'blog_comments.comment', 'blog_comments.created_at', 'users.username')
    //         .where('blog_comments.post_id', postId)
    //         .whereNull('blog_comments.deleted_at');
    
    //     res.json(comments);
    //     } catch (err) {
    //     res.status(500).json({ message: err.message });
    //     }
    // },
    
    // /**
    //  * @swagger
    //  * /api/blog-posts/comments/{commentId}:
    //  *   delete:
    //  *     summary: Menghapus komentar pada artikel (soft delete)
    //  *     tags: [Blog Posts]
    //  *     security:
    //  *       - cookieAuth: []
    //  *     parameters:
    //  *       - in: path
    //  *         name: commentId
    //  *         schema:
    //  *           type: integer
    //  *         required: true
    //  *         description: ID komentar yang akan dihapus
    //  *     responses:
    //  *       200:
    //  *         description: Komentar berhasil dihapus
    //  */
    // deleteComment: async (req, res) => {
    //     const { commentId } = req.params;
    
    //     try {
    //     const comment = await knex('blog_comments')
    //         .where({ id: commentId })
    //         .first();
    
    //     if (!comment) {
    //         return res.status(404).json({ message: 'Komentar tidak ditemukan' });
    //     }
    
    //     await knex('blog_comments')
    //         .where({ id: commentId })
    //         .update({ deleted_at: knex.fn.now() });
    
    //     res.json({ message: 'Komentar berhasil dihapus' });
    //     } catch (error) {
    //     res.status(500).json({ message: 'Gagal menghapus komentar', error: error.message });
    //     }
    // },

    /**
     * @swagger
     * /api/blog-posts/stats/category:
     *   get:
     *     summary: Statistik jumlah artikel per kategori
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Statistik berhasil diambil
     */
    getStatsByCategory: async (req, res) => {
        try {
        const stats = await knex('blog_posts')
            .select('blog_categories.name as category_name')
            .count('blog_posts.id as total_posts')
            .leftJoin('blog_categories', 'blog_posts.category_id', 'blog_categories.id')
            .whereNull('blog_posts.deleted_at')
            .groupBy('blog_posts.category_id', 'blog_categories.name');
    
        res.json({ stats });
        } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil statistik kategori', error: error.message });
        }
    },
    
    /**
     * @swagger
     * /api/blog-posts/stats/author:
     *   get:
     *     summary: Statistik jumlah artikel per author
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Statistik berhasil diambil
     */
    getStatsByAuthor: async (req, res) => {
        try {
        const stats = await knex('blog_posts')
            .select('users.name as author_name')
            .count('blog_posts.id as total_posts')
            .leftJoin('users', 'blog_posts.author_id', 'users.id')
            .whereNull('blog_posts.deleted_at')
            .groupBy('blog_posts.author_id', 'users.name');
    
        res.json({ stats });
        } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil statistik author', error: error.message });
        }
    },
  
    /**
     * @swagger
     * /api/blog-posts/statistics/category:
     *   get:
     *     summary: Menampilkan statistik jumlah artikel per kategori
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Statistik jumlah artikel per kategori
     *         content:
     *           application/json:
     *           schema:
     *             type: array
     *             items:
     *               type: object
     *               properties:
     *                 category_id:
     *                   type: integer
     *                 category_name:
     *                   type: string
     *                 article_count:
     *                   type: integer
     *               example:
     *                 category_id: 1
     *                 category_name: "Teknologi"
     *                 article_count: 10
     */
    getArticleCountByCategory: async (req, res) => {
        try {
            const statistics = await knex('blog_posts')
                .join('blog_categories', 'blog_posts.category_id', '=', 'blog_categories.id')
                .whereNull('blog_posts.deleted_at')  // Hanya artikel yang belum dihapus
                .groupBy('blog_posts.category_id', 'blog_categories.name')
                .select('blog_posts.category_id', 'blog_categories.name as category_name')
                .count('blog_posts.id as article_count');
        
            res.status(200).json(statistics);
        } catch (error) {
            res.status(500).json({ message: 'Gagal mendapatkan statistik kategori artikel', error: error.message });
        }
    },

    /**
     * @swagger
     * /api/blog-posts/statistics/author:
     *   get:
     *     summary: Menampilkan statistik jumlah artikel per author
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Statistik jumlah artikel per author
     *         content:
     *           application/json:
     *           schema:
     *             type: array
     *             items:
     *               type: object
     *               properties:
     *                 author_id:
     *                   type: integer
     *                 author_name:
     *                   type: string
     *                 article_count:
     *                   type: integer
     *               example:
     *                 author_id: 1
     *                 author_name: "John Doe"
     *                 article_count: 5
     */
    getArticleCountByAuthor: async (req, res) => {
        try {
        const statistics = await knex('blog_posts')
            .join('users', 'blog_posts.author_id', '=', 'users.id')
            .whereNull('blog_posts.deleted_at')  // Hanya artikel yang belum dihapus
            .groupBy('blog_posts.author_id', 'users.name')
            .select('blog_posts.author_id', 'users.name as author_name')
            .count('blog_posts.id as article_count');
    
        res.status(200).json(statistics);
        } catch (error) {
        res.status(500).json({ message: 'Gagal mendapatkan statistik artikel per author', error: error.message });
        }
    },

    /**
     * @swagger
     * /api/blog-posts/status/{status}:
     *   get:
     *     summary: Menampilkan artikel berdasarkan status publish
     *     tags: [Blog Posts]
     *     parameters:
     *       - in: path
     *         name: status
     *         required: true
     *         description: Status publish artikel yang ingin difilter (draft, publish, deleted)
     *         schema:
     *           type: string
     *           enum: [draft, publish, deleted]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Artikel dengan status publish tertentu
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/BlogPost'
     *       400:
     *         description: Status tidak valid
     *       404:
     *         description: Tidak ada artikel ditemukan dengan status tersebut
     *       500:
     *         description: Terjadi kesalahan saat mengambil artikel
     */
    getBlogPostsByStatus: async (req, res) => {
        const { status } = req.params; // Mendapatkan status dari parameter URL

        try {
        // Validasi status
        if (!['draft', 'publish', 'deleted'].includes(status)) {
            return res.status(400).json({
            message: 'Status tidak valid. Gunakan draft, publish, atau deleted.',
            });
        }

        // Query untuk mengambil artikel dengan status tertentu
        const rows = await knex('blog_posts')
        .where('status_publish', status)
        .whereNull('deleted_at')
        .orderBy('created_at', 'desc');

        // Jika tidak ada artikel ditemukan
        if (rows.length === 0) {
            return res.status(404).json({
            message: `Tidak ada artikel dengan status ${status}`,
            });
        }

        // Menyajikan hasil query
        return res.status(200).json({
            message: `Berhasil mengambil artikel dengan status ${status}`,
            data: rows,
        });
        } catch (error) {
        console.error('Error retrieving blog posts by status:', error);
        return res.status(500).json({
            message: 'Terjadi kesalahan saat mengambil artikel.',
        });
        }
    },
    
    // /**
    //  * @swagger
    //  * /api/blog-posts/{post_id}/tags:
    //  *   delete:
    //  *     summary: Menghapus tag dari artikel blog
    //  *     tags: [Blog Posts]
    //  *     parameters:
    //  *       - in: path
    //  *         name: post_id
    //  *         required: true
    //  *         description: ID artikel yang tag-nya akan dihapus
    //  *         schema:
    //  *           type: integer
    //  *           example: 1
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             properties:
    //  *               tag_ids:
    //  *                 type: array
    //  *                 items:
    //  *                   type: integer
    //  *                 description: Daftar ID tag yang akan dihapus
    //  *                 example: [1, 2]
    //  *     responses:
    //  *       200:
    //  *         description: Tag berhasil dihapus
    //  *         content:
    //  *           application/json:
    //  *             schema:
    //  *               type: object
    //  *               properties:
    //  *                 message:
    //  *                   type: string
    //  *                   example: Tag berhasil dihapus dari artikel blog
    //  *       400:
    //  *         description: Request tidak lengkap atau format salah
    //  *       500:
    //  *         description: Terjadi kesalahan pada server
    //  */
    // removeTagsFromBlogPost: async (req, res) => {
    //     const { post_id, tag_ids } = req.body;
      
    //     try {
    //       // Validasi jika post_id dan tag_ids diberikan
    //       if (!post_id || !Array.isArray(tag_ids) || tag_ids.length === 0) {
    //         return res.status(400).json({ message: 'Post ID dan tag_ids diperlukan' });
    //       }
      
    //       // Menghapus tag dari artikel blog
    //       await knex('blog_post_tags')
    //         .where('post_id', post_id)
    //         .whereIn('tag_id', tag_ids)
    //         .del();
      
    //       res.status(200).json({ message: 'Tag berhasil dihapus dari artikel blog' });
    //     } catch (error) {
    //       console.error('Error removing tags from blog post:', error);
    //       res.status(500).json({ message: 'Terjadi kesalahan saat menghapus tag' });
    //     }
    // }

    /**
     * @swagger
     * /api/blog-posts/request-topic:
     *   get:
     *     summary: Get all blog topic requests with pagination and filtering (Admin only)
     *     tags: [Admin, Blog Requests]
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
     *         description: Search across name, email, and message
     *         example: "machine learning"
     *     responses:
     *       200:
     *         description: Blog topic requests retrieved successfully
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
     *                   example: "Blog topic requests retrieved successfully"
     *                 data:
     *                   type: object
     *                   properties:
     *                     requests:
     *                       type: array
     *                       items:
     *                         $ref: '#/components/schemas/BlogRequestTopic'
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
     *         description: Admin access required
     *       500:
     *         description: Internal server error
     */
    getAllRequests: async (req, res) => {
        try {
            // Check admin access
            const user_id = decryptId(req.user.id);
            const adminCheck = await knex('admins')
                .where('user_id', user_id)
                .whereNull('deleted_at')
                .first();

            if (!adminCheck) {
                return res.status(403).json({
                    status: 403,
                    message: 'Admin access required',
                    data: null
                });
            }

            // Pagination parameters
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            // Filter parameters
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

            // Build base query
            let baseQuery = knex('blogs_request_topic')
                .whereNull('deleted_at');

            // Apply date range filter
            if (date_from || date_to) {
                if (date_from && date_to) {
                    baseQuery = baseQuery.whereBetween('created_at', [date_from, date_to + ' 23:59:59']);
                } else if (date_from) {
                    baseQuery = baseQuery.where('created_at', '>=', date_from);
                } else if (date_to) {
                    baseQuery = baseQuery.where('created_at', '<=', date_to + ' 23:59:59');
                }
            }

            // Apply search filter
            if (search) {
                baseQuery = baseQuery.where(function() {
                    this.where('name', 'ilike', `%${search}%`)
                        .orWhere('email', 'ilike', `%${search}%`)
                        .orWhere('message', 'ilike', `%${search}%`);
                });
            }

            // Get total count
            const totalCount = await baseQuery.clone()
                .count('id as count')
                .first();

            const total = parseInt(totalCount.count);
            const totalPages = Math.ceil(total / limit);

            // Get requests with pagination and sorting
            const requests = await baseQuery.clone()
                .select('*')
                .orderBy('id', 'desc') // Order by id desc
                .orderBy('created_at', 'desc')
                .limit(limit)
                .offset(offset);

            // Encrypt IDs
            const processedRequests = requests.map(request => ({
                ...request,
                id: encryptId(request.id)
            }));

            const pagination = {
                current_page: page,
                per_page: limit,
                total: total,
                total_pages: totalPages,
                has_next: page < totalPages,
                has_prev: page > 1
            };

            const appliedFilters = {
                date_from: date_from || null,
                date_to: date_to || null,
                search: search || null
            };

            res.status(200).json({
                status: 200,
                message: 'Blog topic requests retrieved successfully',
                data: {
                    requests: processedRequests,
                    pagination: pagination,
                    filters: appliedFilters
                }
            });

        } catch (err) {
            console.error('getAllRequests error:', err);

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
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * components:
     *   schemas:
     *     BlogRequestTopicInput:
     *       type: object
     *       required:
     *         - name
     *         - email
     *         - message
     *       properties:
     *         name:
     *           type: string
     *           description: Requester's name
     *           example: "John Doe"
     *         email:
     *           type: string
     *           description: Requester's email address
     *           example: "john.doe@example.com"
     *         message:
     *           type: string
     *           description: Topic request message
     *           example: "I would like to see a blog post about baby sleep patterns."
     *     BlogRequestTopic:
     *       type: object
     *       properties:
     *         id:
     *           type: string
     *           description: Encrypted ID
     *           example: "encrypted_id_string"
     *         name:
     *           type: string
     *           example: "John Doe"
     *         email:
     *           type: string
     *           example: "john.doe@example.com"
     *         message:
     *           type: string
     *           example: "I would like to see a blog post about baby sleep patterns."
     *         created_at:
     *           type: string
     *           format: date-time
     *           example: "2023-12-01T10:00:00Z"
     *         updated_at:
     *           type: string
     *           format: date-time
     *           example: "2023-12-01T10:00:00Z"
     * 
     * /api/blog-posts/request-topic:
     *   post:
     *     summary: Create a new blog topic request
     *     tags: [Blog Requests]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/BlogRequestTopicInput'
     *     responses:
     *       201:
     *         description: Blog topic request created successfully
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
     *                   example: "Blog topic request submitted successfully"
     *                 data:
     *                   $ref: '#/components/schemas/BlogRequestTopic'
     *       400:
     *         description: Bad request - validation errors
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: integer
     *                   example: 400
     *                 message:
     *                   type: string
     *                   example: "Validation failed"
     *                 data:
     *                   type: object
     *                   properties:
     *                     errors:
     *                       type: array
     *                       items:
     *                         type: string
     *       500:
     *         description: Internal server error
     */
    createRequest: async (req, res) => {
        try {
            const { name, email, message } = req.body;
            // Validation
            const errors = [];
            if (!name || typeof name !== 'string' || name.trim().length < 2) {
                errors.push('Name is required and must be at least 2 characters long');
            }
            if (!email || typeof email !== 'string') {
                errors.push('Email is required');
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errors.push('Email format is invalid');
            }
            if (!message || typeof message !== 'string' || message.trim().length < 10) {
                errors.push('Message is required and must be at least 10 characters long');
            }
            if (errors.length > 0) {
                return res.status(400).json({
                    status: 400,
                    message: 'Validation failed',
                    data: { errors }
                });
            }
            // Create request
            const [newRequest] = await knex('blogs_request_topic')
                .insert({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    message: message.trim(),
                    created_at: knex.fn.now(),
                    updated_at: knex.fn.now()
                })
                .returning('*');
            // Encrypt ID in response
            const response = {
                ...newRequest,
                id: encryptId(newRequest.id)
            };
            res.status(201).json({
                status: 201,
                message: 'Blog topic request submitted successfully',
                });
        } catch (err) {
            console.error('createRequest error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/blog-posts/request-topic/{id}:
     *   delete:
     *     summary: Soft delete a blog topic request (Admin only)
     *     tags: [Admin, Blog Requests]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted request ID
     *         example: "encrypted_request_id"
     *     responses:
     *       200:
     *         description: Blog topic request deleted successfully
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
     *                   example: "Blog topic request deleted successfully"
     *                 data:
     *                   type: null
     *       400:
     *         description: Invalid request ID format
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Admin access required
     *       404:
     *         description: Request not found or already deleted
     *       500:
     *         description: Internal server error
     */
    deleteRequest: async (req, res) => {
        try {
            // Check admin access
            const user_id = decryptId(req.user.id);
            const adminCheck = await knex('admins')
                .where('user_id', user_id)
                .whereNull('deleted_at')
                .first();

            if (!adminCheck) {
                return res.status(403).json({
                    status: 403,
                    message: 'Admin access required',
                    data: null
                });
            }

            const { id } = req.params;

            // Decrypt and validate ID
            let request_id;
            try {
                request_id = decryptId(id);
            } catch (decryptError) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid request ID format',
                    data: null
                });
            }

            // Soft delete the request
            const deleted = await knex('blogs_request_topic')
                .where('id', request_id)
                .whereNull('deleted_at') // Only delete if not already deleted
                .update({
                    deleted_at: knex.fn.now(),
                    updated_at: knex.fn.now()
                });

            if (!deleted) {
                return res.status(404).json({
                    status: 404,
                    message: 'Request not found or already deleted',
                    data: null
                });
            }

            res.status(200).json({
                status: 200,
                message: 'Blog topic request deleted successfully',
                data: null
            });

        } catch (err) {
            console.error('deleteRequest error:', err);

            if (err.message && err.message.includes('decrypt')) {
                return res.status(400).json({
                    status: 400,
                    message: 'Invalid request ID format',
                    data: null
                });
            }

            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    },

    /**
     * @swagger
     * /api/blog-posts/count-by-category:
     *   get:
     *     summary: Get blog posts count grouped by category (Simple version)
     *     tags: [BlogPosts]
     *     parameters:
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *           default: 10
     *         description: Number of categories to return
     *         example: 10
     *     responses:
     *       200:
     *         description: Blog posts count by category retrieved successfully
     */
    getCountByCategory: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;

            if (limit < 1 || limit > 100) {
                return res.status(400).json({
                    status: 400,
                    message: 'Limit must be between 1 and 100',
                    data: null
                });
            }

            const categoryData = await knex('categories as c')
                .innerJoin('blog_posts as bp', 'c.id', 'bp.category_id')
                .whereNull('c.deleted_at')
                .whereNull('bp.deleted_at')
                .select(
                    'c.name as category_name',
                    knex.raw('COUNT(bp.id) as blog_posts_count')
                )
                .groupBy('c.id', 'c.name')
                .orderBy('blog_posts_count', 'desc')
                .limit(limit);

            const processedData = categoryData.map(item => ({
                category_name: item.category_name,
                blog_posts_count: parseInt(item.blog_posts_count)
            }));

            res.status(200).json({
                status: 200,
                message: 'Blog posts count by category retrieved successfully',
                data: processedData
            });

        } catch (err) {
            console.error('getCountByCategorySimple error:', err);
            res.status(500).json({
                status: 500,
                message: 'Internal server error',
                error: err.message
            });
        }
    }
};

module.exports = blogPostController;
