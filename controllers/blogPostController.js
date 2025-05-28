const knex = require('../db/knex');
const dayjs = require('dayjs');
const slugify = require('slugify');

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
     *     summary: Ambil semua blog post
     *     tags: [BlogPosts]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: List blog post
     */
    getAll: async (req, res) => {
        try {
        const posts = await knex('blog_posts')
            .whereNull('deleted_at')
            .orderBy('created_at', 'desc');
        res.json(posts);
        } catch (err) {
        res.status(500).json({ message: err.message });
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
            .where('id', id)
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
            .where({ id })
            .update({
            status_publish: 'deleted',
            deleted_at: knex.fn.now(),
            });
        res.json({ message: 'Blog post berhasil dihapus' });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/blog-posts/{postId}/tags:
     *   post:
     *     summary: Menambahkan tag ke artikel
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: postId
     *         schema:
     *           type: integer
     *         required: true
     *         description: ID artikel
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               tagIds:
     *                 type: array
     *                 items:
     *                   type: integer
     *     responses:
     *       200:
     *         description: Tag berhasil ditambahkan ke artikel
     */
    assignTagsToPost: async (req, res) => {
        const { postId } = req.params;
        const { tagIds } = req.body;
    
        try {
        // Hapus dulu semua relasi tag sebelumnya
        await knex('blog_post_tags').where({ post_id: postId }).del();
    
        const data = tagIds.map(tagId => ({
            post_id: postId,
            tag_id: tagId
        }));
    
        await knex('blog_post_tags').insert(data);
    
        res.json({ message: 'Tag berhasil diperbarui untuk artikel' });
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    },
  
    /**
    * @swagger
    * /api/blog-posts/{postId}/tags:
    *   get:
    *     summary: Mendapatkan semua tag dari sebuah artikel
    *     tags: [Blog Posts]
    *     parameters:
    *       - in: path
    *         name: postId
    *         schema:
    *           type: integer
    *         required: true
    *         description: ID artikel
    *     responses:
    *       200:
    *         description: Daftar tag
    */
    getTagsByPost: async (req, res) => {
    const { postId } = req.params;
    try {
        const tags = await knex('blog_post_tags')
        .join('blog_tags', 'blog_post_tags.tag_id', '=', 'blog_tags.id')
        .select('blog_tags.id', 'blog_tags.name')
        .where('blog_post_tags.post_id', postId)
        .whereNull('blog_tags.deleted_at');

        res.json(tags);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
    },

    /**
     * @swagger
     * /api/blog-posts/{postId}/comments:
     *   post:
     *     summary: Menambahkan komentar ke artikel
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: postId
     *         schema:
     *           type: integer
     *         required: true
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               comment:
     *                 type: string
     *     responses:
     *       200:
     *         description: Komentar berhasil ditambahkan
     */
    addComment: async (req, res) => {
        const { postId } = req.params;
        const { comment } = req.body;
        const userId = req.user.id;
    
        try {
        await knex('blog_comments').insert({ post_id: postId, user_id: userId, comment });
        res.json({ message: 'Komentar berhasil ditambahkan' });
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    },
  
    /**
     * @swagger
     * /api/blog-posts/{postId}/comments:
     *   get:
     *     summary: Mendapatkan komentar dari artikel
     *     tags: [Blog Posts]
     *     parameters:
     *       - in: path
     *         name: postId
     *         schema:
     *           type: integer
     *         required: true
     *     responses:
     *       200:
     *         description: Daftar komentar
     */
    getComments: async (req, res) => {
        const { postId } = req.params;
    
        try {
        const comments = await knex('blog_comments')
            .join('users', 'blog_comments.user_id', '=', 'users.id')
            .select('blog_comments.id', 'blog_comments.comment', 'blog_comments.created_at', 'users.username')
            .where('blog_comments.post_id', postId)
            .whereNull('blog_comments.deleted_at');
    
        res.json(comments);
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },
    
    /**
     * @swagger
     * /api/blog-posts/comments/{commentId}:
     *   delete:
     *     summary: Menghapus komentar pada artikel (soft delete)
     *     tags: [Blog Posts]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: commentId
     *         schema:
     *           type: integer
     *         required: true
     *         description: ID komentar yang akan dihapus
     *     responses:
     *       200:
     *         description: Komentar berhasil dihapus
     */
    deleteComment: async (req, res) => {
        const { commentId } = req.params;
    
        try {
        const comment = await knex('blog_comments')
            .where({ id: commentId })
            .first();
    
        if (!comment) {
            return res.status(404).json({ message: 'Komentar tidak ditemukan' });
        }
    
        await knex('blog_comments')
            .where({ id: commentId })
            .update({ deleted_at: knex.fn.now() });
    
        res.json({ message: 'Komentar berhasil dihapus' });
        } catch (error) {
        res.status(500).json({ message: 'Gagal menghapus komentar', error: error.message });
        }
    },

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
    
    /**
     * @swagger
     * /api/blog-posts/{post_id}/tags:
     *   delete:
     *     summary: Menghapus tag dari artikel blog
     *     tags: [Blog Posts]
     *     parameters:
     *       - in: path
     *         name: post_id
     *         required: true
     *         description: ID artikel yang tag-nya akan dihapus
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
     *               tag_ids:
     *                 type: array
     *                 items:
     *                   type: integer
     *                 description: Daftar ID tag yang akan dihapus
     *                 example: [1, 2]
     *     responses:
     *       200:
     *         description: Tag berhasil dihapus
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Tag berhasil dihapus dari artikel blog
     *       400:
     *         description: Request tidak lengkap atau format salah
     *       500:
     *         description: Terjadi kesalahan pada server
     */
    removeTagsFromBlogPost: async (req, res) => {
        const { post_id, tag_ids } = req.body;
      
        try {
          // Validasi jika post_id dan tag_ids diberikan
          if (!post_id || !Array.isArray(tag_ids) || tag_ids.length === 0) {
            return res.status(400).json({ message: 'Post ID dan tag_ids diperlukan' });
          }
      
          // Menghapus tag dari artikel blog
          await knex('blog_post_tags')
            .where('post_id', post_id)
            .whereIn('tag_id', tag_ids)
            .del();
      
          res.status(200).json({ message: 'Tag berhasil dihapus dari artikel blog' });
        } catch (error) {
          console.error('Error removing tags from blog post:', error);
          res.status(500).json({ message: 'Terjadi kesalahan saat menghapus tag' });
        }
    }
};

module.exports = blogPostController;
