const axios = require('axios');

const BASE_URL = 'https://pro.rajaongkir.com/api';
const API_KEY = process.env.RAJAONGKIR_API_KEY;

const headers = {
  key: API_KEY
};

// /**
//  * @swagger
//  * tags:
//  *   name: Shipping
//  *   description: RajaOngkir API Integration
//  */

module.exports = {

    // /**
    //  * @swagger
    //  * /api/shipping/provinces:
    //  *   get:
    //  *     summary: Get all provinces
    //  *     tags: [Shipping]
    //  *     responses:
    //  *       200:
    //  *         description: List of provinces
    //  */
    // getProvinces: async (req, res) => {
    //     try {
    //       const response = await axios.get(`${BASE_URL}/province`, { headers });
    //       res.json(response.data);
    //     } catch (error) {
    //       res.status(500).json({ message: error.message });
    //     }
    // },
    
    // /**
    //  * @swagger
    //  * /api/shipping/cities:
    //  *   get:
    //  *     summary: Get cities by province
    //  *     tags: [Shipping]
    //  *     parameters:
    //  *       - in: query
    //  *         name: province
    //  *         schema:
    //  *           type: string
    //  *         required: true
    //  *         description: Province ID
    //  *     responses:
    //  *       200:
    //  *         description: List of cities
    //  *       400:
    //  *         description: Province query is required
    //  */
    // getCities: async (req, res) => {
    //     try {
    //       const { province } = req.query;
    //       const response = await axios.get(`${BASE_URL}/city?province=${province}`, { headers });
    //       res.json(response.data);
    //     } catch (error) {
    //       res.status(500).json({ message: error.message });
    //     }
    // },
    
    // /**
    //  * @swagger
    //  * /api/shipping/subdistricts:
    //  *   get:
    //  *     summary: Get subdistricts by city
    //  *     tags: [Shipping]
    //  *     parameters:
    //  *       - in: query
    //  *         name: city
    //  *         schema:
    //  *           type: string
    //  *         required: true
    //  *         description: City ID
    //  *     responses:
    //  *       200:
    //  *         description: List of subdistricts
    //  *       400:
    //  *         description: City query is required
    //  */
    // getSubdistricts: async (req, res) => {
    //     try {
    //       const { city } = req.query;
    //       const response = await axios.get(`${BASE_URL}/subdistrict?city=${city}`, { headers });
    //       res.json(response.data);
    //     } catch (error) {
    //       res.status(500).json({ message: error.message });
    //     }
    // },
    
    // /**
    //  * @swagger
    //  * /api/shipping/couriers:
    //  *   get:
    //  *     summary: Get list of available couriers
    //  *     tags: [Shipping]
    //  *     responses:
    //  *       200:
    //  *         description: List of couriers
    //  */
    // getCouriers: (req, res) => {
    //     res.json({
    //       couriers: [
    //         { code: 'POS', name: 'POS Indonesia' },
    //         { code: 'LION', name: 'Lion Parcel' },
    //         { code: 'NINJA', name: 'Ninja Xpress' },
    //         { code: 'IDE', name: 'ID Express' },
    //         { code: 'SICEPAT', name: 'SiCepat Express' },
    //         { code: 'SAP', name: 'SAP Express' },
    //         { code: 'NCS', name: 'Nusantara Card Semesta' },
    //         { code: 'ANTERAJA', name: 'AnterAja' },
    //         { code: 'REX', name: 'Royal Express Indonesia' },
    //         { code: 'JTL', name: 'JTL Express' },
    //         { code: 'SENTRAL', name: 'Sentral Cargo' },
    //         { code: 'JNE', name: 'Jalur Nugraha Ekakurir' },
    //         { code: 'TIKI', name: 'Citra Van Titipan Kilat' },
    //         { code: 'RPX', name: 'RPX Holding' },
    //         { code: 'PANDU', name: 'Pandu Logistics' },
    //         { code: 'WAHANA', name: 'Wahana Prestasi Logistik' },
    //         { code: 'J&T', name: 'J&T Express' },
    //         { code: 'PAHALA', name: 'Pahala Kencana Express' },
    //         { code: 'SLIS', name: 'Solusi Ekspres' },
    //         { code: 'EXPEDITO', name: 'Expedito' },
    //         { code: 'RAY', name: 'Rayspeed' },
    //         { code: 'DSE', name: '21 Express' },
    //         { code: 'FIRST', name: 'First Logistics' },
    //         { code: 'STAR', name: 'Star Cargo' },
    //         { code: 'IDL', name: 'IDL Cargo' },
    //       ]
    //     });
    // },
    
    // /**
    //  * @swagger
    //  * /api/shipping/track:
    //  *   post:
    //  *     summary: Track a shipment by waybill number and courier
    //  *     tags: [Shipping]
    //  *     requestBody:
    //  *       required: true
    //  *       content:
    //  *         application/json:
    //  *           schema:
    //  *             type: object
    //  *             properties:
    //  *               waybill:
    //  *                 type: string
    //  *                 example: "1234567890"
    //  *               courier:
    //  *                 type: string
    //  *                 example: "jne"
    //  *     responses:
    //  *       200:
    //  *         description: Tracking result
    //  *       400:
    //  *         description: waybill and courier are required
    //  *       500:
    //  *         description: Failed to track shipment
    //  */
    // trackShipment: async (req, res) => {
    //     const { waybill, courier } = req.query;
      
    //     if (!waybill || !courier) {
    //       return res.status(400).json({ message: 'waybill and courier are required' });
    //     }
      
    //     try {
    //       const response = await axios.post(`${BASE_URL}/waybill`, {
    //         waybill,
    //         courier
    //       }, { headers });
      
    //       res.json(response.data);
    //     } catch (error) {
    //       const err = error.response?.data || error;
    //       res.status(500).json({ message: err.message || 'Failed to track shipment' });
    //     }
    // }
}
