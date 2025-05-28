const knex = require('../db/knex');

/**
 * @swagger
 * tags:
 *   name: GeneralSettings
 *   description: Manage general settings of the platform
 */

module.exports = {
  /**
   * @swagger
   * /api/general-settings:
   *   get:
   *     summary: Get general settings
   *     tags: [GeneralSettings]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: General settings data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 settings:
   *                   type: object
   *                   description: The settings data
   */
  getSettings: async (req, res) => {
    try {
      const [settings] = await knex('general_settings').select('*').limit(1);
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  /**
   * @swagger
   * /api/general-settings:
   *   put:
   *     summary: Update general settings
   *     tags: [GeneralSettings]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             example:
   *               link_instagram: "https://instagram.com/yourstore"
   *               link_whatsapp: "https://wa.me/628123456789"
   *               alamat: "Jl. Contoh No. 123"
   *               email: "store@example.com"
   *               service_fee_mode: "buyer"
   *               waktu_operasi_toko: "08:00 - 17:00"
   *     responses:
   *       200:
   *         description: Settings updated or created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   */
  updateSettings: async (req, res) => {
    try {
      const data = req.body;
      data.updated_at = new Date();

      const existing = await knex('general_settings').select('id').first();

      if (existing) {
        await knex('general_settings')
          .where({ id: existing.id })
          .update(data);
        res.json({ message: 'Settings updated' });
      } else {
        await knex('general_settings').insert(data);
        res.status(201).json({ message: 'Settings created' });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
};
