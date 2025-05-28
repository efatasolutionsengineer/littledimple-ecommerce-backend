// controllers/categoriesController.js
const knex = require('../db/knex');

/**
 * @swagger
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
   */
  getAll: async (req, res) => {
    try {
      const categories = await knex('categories')
        .whereNull('deleted_at');
      res.json({ categories });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/categories/{id}:
   *   get:
   *     summary: Get category by ID
   *     tags: [Categories]
   */
  getById: async (req, res) => {
    try {
      const category = await knex('categories')
        .where({ id: req.params.id })
        .whereNull('deleted_at')
        .first();

      if (!category) return res.status(404).json({ message: 'Category not found' });
      res.json({ category });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/categories:
   *   post:
   *     summary: Create a new category
   *     tags: [Categories]
   */
  create: async (req, res) => {
    const { name, description } = req.body;
    try {
      const [category] = await knex('categories')
        .insert({ name, description })
        .returning('*');
      res.status(201).json({ category });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/categories/{id}:
   *   put:
   *     summary: Update a category
   *     tags: [Categories]
   */
  update: async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
      const updated = await knex('categories')
        .where({ id })
        .whereNull('deleted_at')
        .update(data)
        .returning('*');

      if (!updated.length) return res.status(404).json({ message: 'Category not found' });
      res.json({ category: updated[0] });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/categories/{id}:
   *   delete:
   *     summary: Soft delete a category
   *     tags: [Categories]
   */
  softDelete: async (req, res) => {
    try {
      const deleted = await knex('categories')
        .where({ id: req.params.id })
        .whereNull('deleted_at')
        .update({ deleted_at: knex.fn.now() });

      if (!deleted) return res.status(404).json({ message: 'Category not found or already deleted' });
      res.json({ message: 'Category soft-deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};
