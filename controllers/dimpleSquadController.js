const knex = require('../db/knex');

module.exports = {
  /**
   * @swagger
   * components:
   *   schemas:
   *     DimpleSquad:
   *       type: object
   *       properties:
   *         id:
   *           type: integer
   *         introduction_title:
   *           type: string
   *         introduction_description:
   *           type: string
   *         introduction_media_link:
   *           type: string
   *         benefit_title:
   *           type: string
   *         benefit_object:
   *           type: array
   *           items:
   *             type: object
   *             properties:
   *               icon:
   *                 type: string
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *         howtojoin_title:
   *           type: string
   *         howtojoin_description:
   *           type: string
   *         howtojoin_button_link:
   *           type: string
   *         howtojoin_button_title:
   *           type: string
   *         activities_gallery:
   *           type: array
   *           items:
   *             type: object
   *             properties:
   *               media_link:
   *                 type: string
   *         created_at:
   *           type: string
   *           format: date-time
   *         updated_at:
   *           type: string
   *           format: date-time
   */

  /**
   * @swagger
   * /api/dimple-squad:
   *   post:
   *     summary: Create a new Dimple Squad entry
   *     tags: [Dimple Squad]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DimpleSquad'
   *     responses:
   *       201:
   *         description: Created successfully
   */
  create: async (req, res) => {
    try {
      const [entry] = await knex('dimple_squad').insert(req.body).returning('*');
      res.status(201).json({ message: 'Created successfully', data: entry });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/dimple-squad:
   *   get:
   *     summary: Get all Dimple Squad entries
   *     tags: [Dimple Squad]
   *     responses:
   *       200:
   *         description: List of entries
   */
  getAll: async (req, res) => {
    try {
      const entries = await knex('dimple_squad').select('*');
      res.json({ data: entries });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/dimple-squad/{id}:
   *   get:
   *     summary: Get a Dimple Squad entry by ID
   *     tags: [Dimple Squad]
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Entry found
   *       404:
   *         description: Entry not found
   */
  getById: async (req, res) => {
    try {
      const entry = await knex('dimple_squad').where({ id: req.params.id }).first();
      if (!entry) return res.status(404).json({ message: 'Not found' });
      res.json({ data: entry });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/dimple-squad/{id}:
   *   put:
   *     summary: Update a Dimple Squad entry
   *     tags: [Dimple Squad]
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DimpleSquad'
   *     responses:
   *       200:
   *         description: Entry updated
   *       404:
   *         description: Entry not found
   */
  update: async (req, res) => {
    try {
      const updated = await knex('dimple_squad')
        .where({ id: req.params.id })
        .update({ ...req.body, updated_at: new Date() });

      if (!updated) return res.status(404).json({ message: 'Not found' });
      res.json({ message: 'Updated successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};
