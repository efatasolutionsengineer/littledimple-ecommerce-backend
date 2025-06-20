// controllers/categoriesController.js
const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption');

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Encrypted category ID
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         media_id:
 *           type: string
 *           description: Encrypted gallery ID for category image
 *         gallery_info:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *               description: Gallery image URL
 *     CategoryInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         media_id:
 *           type: string
 *           description: Encrypted gallery ID for category image
 * 
 * tags:
 *   name: Categories
 *   description: Category management
 */
module.exports = {
  /**
   * @swagger
   * /api/categories:
   *   get:
   *     summary: Get all categories
   *     tags: [Categories]
   *     responses:
   *       200:
   *         description: List of categories
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 categories:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Category'
   *       500:
   *         description: Server error
   */
  getAll: async (req, res) => {
    try {
      // Get categories with gallery information
      const categories = await knex('categories')
        .leftJoin('media_gallery', 'categories.media_id', 'media_gallery.id')
        .select(
          'categories.id',
          'categories.name',
          'categories.description',
          'categories.media_id',
          'media_gallery.image_high as gallery_url'
        )
        .whereNull('categories.deleted_at');
      
      // Process categories and encrypt IDs
      const processedCategories = categories.map(category => ({
        id: encryptId(category.id),
        name: category.name,
        description: category.description,
        media_id: category.media_id ? encryptId(category.media_id) : null,
        gallery_info: category.gallery_url ? {
          url: category.gallery_url
        } : null
      }));
      
      res.json({ categories: processedCategories });
    } catch (err) {
      console.error('Error getting categories:', err);
      res.status(500).json({ message: err.message });
    }
  },
  
  /**
   * @swagger
   * /api/categories/{id}:
   *   get:
   *     summary: Get category by ID
   *     tags: [Categories]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Encrypted category ID
   *     responses:
   *       200:
   *         description: Category details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 category:
   *                   $ref: '#/components/schemas/Category'
   *       404:
   *         description: Category not found
   *       500:
   *         description: Server error
   */
  getById: async (req, res) => {
    try {
      // Decrypt the category ID
      let categoryId;
      try {
        categoryId = decryptId(req.params.id);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid category ID format' });
      }
      
      // Get category with gallery information
      const category = await knex('categories')
        .leftJoin('media_gallery', 'categories.media_id', 'media_gallery.id')
        .select(
          'categories.id',
          'categories.name',
          'categories.description',
          'categories.media_id',
          'media_gallery.image_high as gallery_url'
        )
        .where('categories.id', categoryId)
        .whereNull('categories.deleted_at')
        .first();
      
      if (!category) return res.status(404).json({ message: 'Category not found' });
      
      // Process category and encrypt IDs
      const processedCategory = {
        id: encryptId(category.id),
        name: category.name,
        description: category.description,
        media_id: category.media_id ? encryptId(category.media_id) : null,
        gallery_info: category.gallery_url ? {
          url: category.gallery_url
        } : null
      };
      
      res.json({ category: processedCategory });
    } catch (err) {
      console.error('Error getting category by ID:', err);
      res.status(500).json({ message: err.message });
    }
  },
  
  /**
   * @swagger
   * /api/categories:
   *   post:
   *     summary: Create a new category
   *     tags: [Categories]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CategoryInput'
   *     responses:
   *       201:
   *         description: Category created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 category:
   *                   $ref: '#/components/schemas/Category'
   *       400:
   *         description: Invalid input
   *       500:
   *         description: Server error
   */
  create: async (req, res) => {
    try {
      const { name, description, media_id } = req.body;
      
      // Validate required fields
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Name is required' });
      }
      
      // Prepare category data
      const categoryData = { 
        name, 
        description 
      };
      
      // Handle media_id if provided
      if (media_id) {
        try {
          // Decrypt the gallery ID
          const decryptedGalleryId = decryptId(media_id);
          
          // Verify gallery exists
          const galleryExists = await knex('media_gallery')
            .where('id', decryptedGalleryId)
            .whereNull('deleted_at')
            .first();
            
          if (!galleryExists) {
            return res.status(400).json({ message: 'Invalid gallery ID - gallery not found' });
          }
          
          categoryData.media_id = decryptedGalleryId;
        } catch (err) {
          return res.status(400).json({ message: 'Invalid gallery ID format' });
        }
      }
      
      // Insert the new category
      const [newCategory] = await knex('categories')
        .insert(categoryData)
        .returning('*');
      
      // Get gallery information if media_id exists
      let galleryInfo = null;
      if (newCategory.media_id) {
        const gallery = await knex('media_gallery')
          .where('id', newCategory.media_id)
          .select('url')
          .first();
          
        if (gallery) {
          galleryInfo = {
            url: gallery.url
          };
        }
      }
      
      // Format the response
      const processedCategory = {
        id: encryptId(newCategory.id),
        name: newCategory.name,
        description: newCategory.description,
        media_id: newCategory.media_id ? encryptId(newCategory.media_id) : null,
        gallery_info: galleryInfo
      };
      
      res.status(201).json({ category: processedCategory });
    } catch (err) {
      console.error('Error creating category:', err);
      res.status(500).json({ message: err.message });
    }
  },
  
  /**
   * @swagger
   * /api/categories/{id}:
   *   put:
   *     summary: Update a category
   *     tags: [Categories]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Encrypted category ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CategoryInput'
   *     responses:
   *       200:
   *         description: Category updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 category:
   *                   $ref: '#/components/schemas/Category'
   *       400:
   *         description: Invalid input
   *       404:
   *         description: Category not found
   *       500:
   *         description: Server error
   */
  update: async (req, res) => {
    try {
      // Decrypt the category ID
      let categoryId;
      try {
        categoryId = decryptId(req.params.id);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid category ID format' });
      }
      
      // Extract update data
      const { name, description, media_id } = req.body;
      
      // Prepare update data
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      
      // Handle media_id if provided
      if (media_id !== undefined) {
        if (media_id === null) {
          // Clear media_id if null is explicitly provided
          updateData.media_id = null;
        } else {
          try {
            // Decrypt the gallery ID
            const decryptedGalleryId = decryptId(media_id);
            
            // Verify gallery exists
            const galleryExists = await knex('media_gallery')
              .where('id', decryptedGalleryId)
              .whereNull('deleted_at')
              .first();
              
            if (!galleryExists) {
              return res.status(400).json({ message: 'Invalid gallery ID - gallery not found' });
            }
            
            updateData.media_id = decryptedGalleryId;
          } catch (err) {
            return res.status(400).json({ message: 'Invalid gallery ID format' });
          }
        }
      }
      
      // Update the category
      const updated = await knex('categories')
        .where({ id: categoryId })
        .whereNull('deleted_at')
        .update(updateData)
        .returning('*');
        
      if (!updated.length) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const updatedCategory = updated[0];
      
      // Get gallery information if media_id exists
      let galleryInfo = null;
      if (updatedCategory.media_id) {
        const gallery = await knex('media_gallery')
          .where('id', updatedCategory.media_id)
          .select('url')
          .first();
          
        if (gallery) {
          galleryInfo = {
            url: gallery.url
          };
        }
      }
      
      // Format the response
      const processedCategory = {
        id: encryptId(updatedCategory.id),
        name: updatedCategory.name,
        description: updatedCategory.description,
        media_id: updatedCategory.media_id ? encryptId(updatedCategory.media_id) : null,
        gallery_info: galleryInfo
      };
      
      res.json({ category: processedCategory });
    } catch (err) {
      console.error('Error updating category:', err);
      res.status(500).json({ message: err.message });
    }
  },
  
  /**
   * @swagger
   * /api/categories/{id}:
   *   delete:
   *     summary: Soft delete a category
   *     tags: [Categories]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Encrypted category ID
   *     responses:
   *       200:
   *         description: Category deleted successfully
   *       400:
   *         description: Invalid ID format
   *       404:
   *         description: Category not found
   *       500:
   *         description: Server error
   */
  softDelete: async (req, res) => {
    try {
      // Decrypt the category ID
      let categoryId;
      try {
        categoryId = decryptId(req.params.id);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid category ID format' });
      }
      
      // Perform soft delete
      const deleted = await knex('categories')
        .where({ id: categoryId })
        .whereNull('deleted_at')
        .update({ deleted_at: knex.fn.now() });
        
      if (!deleted) {
        return res.status(404).json({ message: 'Category not found or already deleted' });
      }
      
      res.json({ message: 'Category soft-deleted successfully' });
    } catch (err) {
      console.error('Error deleting category:', err);
      res.status(500).json({ message: err.message });
    }
  },
};