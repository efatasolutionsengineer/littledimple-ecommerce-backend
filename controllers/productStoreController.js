const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption');

module.exports = {
    /**
     * @swagger
     * components:
     *   schemas:
     *     ProductStore:
     *       type: object
     *       properties:
     *         encrypted_id:
     *           type: string
     *           example: "encrypted123"
     *         area:
     *           type: string
     *         kode_toko:
     *           type: string
     *         alamat:
     *           type: string
     *         nomor_hp:
     *           type: string
     *         website:
     *           type: string
     *         link_map:
     *           type: string
     *         active:
     *           type: boolean
     *         created_at:
     *           type: string
     *           format: date-time
     *         updated_at:
     *           type: string
     *           format: date-time
     * 
     *   responses:
     *     ProductStoreList:
     *       type: array
     *       items:
     *         $ref: '#/components/schemas/ProductStore'
     */

    /**
     * @swagger
     * /api/stores:
     *   post:
     *     summary: Create a new product store
     *     tags: [Product Store]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [area, kode_toko]
     *             properties:
     *               area:
     *                 type: string
     *               kode_toko:
     *                 type: string
     *               alamat:
     *                 type: string
     *               nomor_hp:
     *                 type: string
     *               website:
     *                 type: string
     *               link_map:
     *                 type: string
     *               active:
     *                 type: boolean
     *     responses:
     *       201:
     *         description: Store created
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ProductStore'
     */
    createStore: async (req, res) => {
        try {
        const {
            area,
            kode_toko,
            alamat,
            nomor_hp,
            website,
            link_map,
            active = true,
        } = req.body;

        const [store] = await knex('product_store')
            .insert({
            area,
            kode_toko,
            alamat,
            nomor_hp,
            website,
            link_map,
            active,
            })
            .returning('*');

        store.encrypted_id = encryptId(store.id);
        delete store.id;

        res.status(201).json({ message: 'Store created', data: store });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/stores:
     *   get:
     *     summary: Get all product stores
     *     tags: [Product Store]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: A list of stores
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/responses/ProductStoreList'
     */
    getAllStores: async (req, res) => {
        try {
        const stores = await knex('product_store').select('*');

        const data = stores.map(store => {
            const { id, ...rest } = store;
            return {
            ...rest,
            encrypted_id: encryptId(id),
            };
        });

        res.json({ data });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/stores/{id}:
     *   get:
     *     summary: Get a store by ID
     *     tags: [Product Store]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted store ID
     *     responses:
     *       200:
     *         description: Store found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ProductStore'
     *       404:
     *         description: Store not found
     */
    getStoreById: async (req, res) => {
        try {
        const id = decryptId(req.params.id);

        const store = await knex('product_store')
            .where({ id })
            .first();

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { id: storeId, ...rest } = store;
        res.json({ data: { ...rest, encrypted_id: encryptId(storeId) } });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/stores/{id}:
     *   put:
     *     summary: Update a store by ID
     *     tags: [Product Store]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted store ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               area:
     *                 type: string
     *               alamat:
     *                 type: string
     *               nomor_hp:
     *                 type: string
     *               website:
     *                 type: string
     *               link_map:
     *                 type: string
     *               active:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Store updated successfully
     *       404:
     *         description: Store not found
     */
    updateStore: async (req, res) => {
        try {
        const id = decryptId(req.params.id);

        const updatedData = {
            ...req.body,
            updated_at: new Date(),
        };

        const updated = await knex('product_store')
            .where({ id })
            .update(updatedData);

        if (!updated) {
            return res.status(404).json({ message: 'Store not found' });
        }

        res.json({ message: 'Store updated successfully' });
        } catch (err) {
        res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/stores/{id}:
     *   delete:
     *     summary: Soft delete a store by setting active to false
     *     tags: [Product Store]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Encrypted store ID
     *     responses:
     *       200:
     *         description: Store soft deleted
     *       404:
     *         description: Store not found
     */
    deleteStore: async (req, res) => {
    try {
        const id = decryptId(req.params.id);

        const deleted = await knex('product_store')
        .where({ id, active: true }) // only soft-delete if it's currently active
        .update({
            active: false,
            updated_at: new Date()
        });

        if (!deleted) {
        return res.status(404).json({ message: 'Store not found or already inactive' });
        }

        res.json({ message: 'Store soft deleted (marked as inactive)' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
    }
};
