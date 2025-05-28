const knex = require('../db/knex');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * tags:
 *   name: ProductImages
 *   description: Product image management
 */

const imageUploadDir = path.join(__dirname, '..', 'uploads');

const compressImage = async (buffer, filename) => {
  const filePaths = {};

  filePaths.original = path.join(imageUploadDir, `original_${filename}`);
  filePaths.small = path.join(imageUploadDir, `small_${filename}`);
  filePaths.medium = path.join(imageUploadDir, `medium_${filename}`);
  filePaths.large = path.join(imageUploadDir, `large_${filename}`);

  fs.writeFileSync(filePaths.original, buffer);

  await sharp(buffer).resize(100).toFile(filePaths.small);
  await sharp(buffer).resize(300).toFile(filePaths.medium);
  await sharp(buffer).resize(800).toFile(filePaths.large);

  return {
    image_url_original: `/uploads/original_${filename}`,
    image_url_small: `/uploads/small_${filename}`,
    image_url_medium: `/uploads/medium_${filename}`,
    image_url_large: `/uploads/large_${filename}`,
  };
};

module.exports = {
    /**
     * @swagger
     * /api/product-images:
     *   post:
     *     summary: Upload product images
     *     tags: [ProductImages]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               product_id:
     *                 type: integer
     *               category:
     *                 type: string
     *                 enum: [main, thumbnail, gallery, zoom]
     *               is_main:
     *                 type: boolean
     *               images:
     *                 type: array
     *                 items:
     *                   type: string
     *                   format: binary
     *     responses:
     *       200:
     *         description: Images uploaded and processed successfully
     */
    uploadImages: async (req, res) => {
        try {
        // If multer has any error (e.g., file size exceeded or invalid file type)
        if (req.fileValidationError) {
            return res.status(400).json({ message: req.fileValidationError });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No images uploaded' });
        }

        const { product_id, category = 'main', is_main = false } = req.body;
        const files = req.files;

        const imagePathsArray = [];

        for (let file of files) {
            const filename = `${Date.now()}_${uuidv4()}_${file.originalname}`;
            const imagePaths = await compressImage(file.buffer, filename);

            imagePathsArray.push({
            product_id,
            category,
            is_main,
            ...imagePaths,
            });
        }

        await knex('product_images').insert(imagePathsArray);

        res.json({ message: 'Images uploaded successfully', images: imagePathsArray });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    uploadImagesBlog: async (req, res) => {
        try {
            // If multer has any error (e.g., file size exceeded or invalid file type)
            if (req.fileValidationError) {
                return res.status(400).json({ message: req.fileValidationError });
            }
    
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: 'No images uploaded' });
            }
    
            const { category = 'main', is_main = false } = req.body;
            const files = req.files;
    
            const imagePathsArray = [];
    
            for (let file of files) {
                const filename = `${Date.now()}_${uuidv4()}_${file.originalname}`;
                const imagePaths = await compressImage(file.buffer, filename);
    
                imagePathsArray.push({
                product_id: null,
                category,
                is_main,
                ...imagePaths,
                });
            }
    
            await knex('product_images').insert(imagePathsArray);
    
            res.json({ message: 'Images uploaded successfully', images: imagePathsArray });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/product-images/{productId}:
     *   get:
     *     summary: Get images by product ID
     *     tags: [ProductImages]
     *     parameters:
     *       - name: productId
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: List of product images
     */
    getImagesByProductId: async (req, res) => {
        const { productId } = req.params;
        try {
        const images = await knex('product_images')
            .where({ product_id: productId })
            .whereNull('deleted_at');

        res.json(images);
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/product-images/{id}:
     *   delete:
     *     summary: Soft delete product image
     *     tags: [ProductImages]
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
     *         description: Image soft deleted
     */
    softDeleteImage: async (req, res) => {
        const { id } = req.params;
        try {
        await knex('product_images')
            .where({ id })
            .update({ deleted_at: knex.fn.now() });

        res.json({ message: 'Image soft deleted' });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/product-images/{id}:
     *   put:
     *     summary: Update a product image
     *     tags: [ProductImages]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: The ID of the product image to update
     *       - in: formData
     *         name: category
     *         type: string
     *         enum: [main, thumbnail, gallery, zoom]
     *         description: The category of the image
     *       - in: formData
     *         name: is_main
     *         type: boolean
     *         description: Whether this image is the main image
     *       - in: formData
     *         name: images
     *         type: array
     *         items:
     *           type: string
     *           format: binary
     *     responses:
     *       200:
     *         description: Image updated successfully
     *       400:
     *         description: Bad request
     *       404:
     *         description: Product image not found
     */
    updateImage: async (req, res) => {
        const { id } = req.params;
        const { category, is_main } = req.body;
        try {
        // Cek apakah gambar produk dengan ID yang diberikan ada
        const image = await knex('product_images').where({ id }).whereNull('deleted_at').first();
        if (!image) {
            return res.status(404).json({ message: 'Product image not found' });
        }

        // Jika ada file gambar baru, proses upload dan kompresi
        if (req.files && req.files.length > 0) {
            const updatedImagePaths = await Promise.all(
            req.files.map(async (file) => {
                const filename = `${Date.now()}-${file.originalname}`;
                return await compressImage(file.buffer, filename);
            })
            );

            // Update URL gambar baru di dalam database
            await knex('product_images')
            .where({ id })
            .update({
                image_url_original: updatedImagePaths[0].original,  // Ambil path gambar asli dari kompresi
                image_url_small: updatedImagePaths[0].small,
                image_url_medium: updatedImagePaths[0].medium,
                image_url_large: updatedImagePaths[0].large,
                category: category || image.category,
                is_main: is_main !== undefined ? is_main : image.is_main,
            });

            return res.json({ message: 'Image updated successfully' });
        }

        // Jika tidak ada gambar baru, hanya update kategori dan is_main
        await knex('product_images')
            .where({ id })
            .update({
            category: category || image.category,
            is_main: is_main !== undefined ? is_main : image.is_main,
            });

        res.json({ message: 'Image details updated successfully' });

        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },
};
