const RajaOngkir = require('../services/rajaongkir');

// Initialize RajaOngkir instances based on environment variables
const API_KEY_STARTER = process.env.RAJAONGKIR_STARTER_KEY;
const API_KEY_BASIC = process.env.RAJAONGKIR_BASIC_KEY;
const API_KEY_PRO = process.env.RAJAONGKIR_PRO_KEY;

let starterAPI, basicAPI, proAPI;

if (API_KEY_STARTER) starterAPI = RajaOngkir.Starter(API_KEY_STARTER);
if (API_KEY_BASIC) basicAPI = RajaOngkir.Basic(API_KEY_BASIC);
if (API_KEY_PRO) proAPI = RajaOngkir.Pro(API_KEY_PRO);

/**
 * @swagger
 * components:
 *   schemas:
 *     Province:
 *       type: object
 *       properties:
 *         province_id:
 *           type: string
 *         province:
 *           type: string
 *     City:
 *       type: object
 *       properties:
 *         city_id:
 *           type: string
 *         province_id:
 *           type: string
 *         province:
 *           type: string
 *         type:
 *           type: string
 *         city_name:
 *           type: string
 *         postal_code:
 *           type: string
 *     CostRequest:
 *       type: object
 *       required:
 *         - origin
 *         - destination
 *         - weight
 *       properties:
 *         origin:
 *           type: string
 *           example: "501"
 *         destination:
 *           type: string
 *           example: "114"
 *         weight:
 *           type: integer
 *           example: 1700
 *         courier:
 *           type: string
 *           example: "jne"
 *     WaybillRequest:
 *       type: object
 *       required:
 *         - waybill
 *       properties:
 *         waybill:
 *           type: string
 *           example: "8389890055"
 */

// Helper function to get the best available API
function getBestAPI() {
  if (proAPI) return proAPI;
  if (basicAPI) return basicAPI;
  if (starterAPI) return starterAPI;
  throw new Error('No RajaOngkir API key configured');
}

// Helper function to handle API responses
function handleResponse(res, apiCall, errorMessage = 'Failed to fetch data from RajaOngkir') {
  return apiCall
    .then(result => {
      res.status(200).json({
        status: 200,
        message: 'Success',
        });
    })
    .catch(error => {
      console.error(errorMessage, error);
      res.status(500).json({
        status: 500,
        message: errorMessage,
        error: error.message || error
      });
    });
}

module.exports = {
  /**
   * @swagger
   * /api/rajaongkir/provinces:
   *   get:
   *     summary: Mendapatkan daftar provinsi
   *     tags: [RajaOngkir]
   *     responses:
   *       200:
   *         description: Daftar provinsi berhasil diambil
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: integer
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Province'
   */
  getProvinces: async (req, res) => {
    const api = getBestAPI();
    return handleResponse(res, api.getProvinces(), 'Failed to fetch provinces');
  },

  /**
   * @swagger
   * /api/rajaongkir/provinces/{id}:
   *   get:
   *     summary: Mendapatkan detail provinsi berdasarkan ID
   *     tags: [RajaOngkir]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID provinsi
   */
  getProvince: async (req, res) => {
    const api = getBestAPI();
    const { id } = req.params;
    return handleResponse(res, api.getProvince(id), 'Failed to fetch province');
  },

  /**
   * @swagger
   * /api/rajaongkir/cities:
   *   get:
   *     summary: Mendapatkan daftar kota/kabupaten
   *     tags: [RajaOngkir]
   *     parameters:
   *       - in: query
   *         name: province
   *         schema:
   *           type: string
   *         description: ID provinsi untuk filter kota
   */
  getCities: async (req, res) => {
    const api = getBestAPI();
    const params = req.query;
    
    if (Object.keys(params).length > 0 && api.getCities.length > 0) {
      // Basic and Pro support parameters
      return handleResponse(res, api.getCities(params), 'Failed to fetch cities');
    } else {
      // Starter version or no parameters
      return handleResponse(res, api.getCities(), 'Failed to fetch cities');
    }
  },

  /**
   * @swagger
   * /api/rajaongkir/cities/{id}:
   *   get:
   *     summary: Mendapatkan detail kota berdasarkan ID
   *     tags: [RajaOngkir]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: ID kota
   */
  getCity: async (req, res) => {
    const api = getBestAPI();
    const { id } = req.params;
    return handleResponse(res, api.getCity(id), 'Failed to fetch city');
  },

  /**
   * @swagger
   * /api/rajaongkir/subdistricts:
   *   get:
   *     summary: Mendapatkan daftar kecamatan (Pro only)
   *     tags: [RajaOngkir]
   *     parameters:
   *       - in: query
   *         name: city
   *         required: true
   *         schema:
   *           type: string
   *         description: ID kota
   */
  getSubDistricts: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Sub-district feature requires Pro API key'
      });
    }
    
    const params = req.query;
    return handleResponse(res, proAPI.getSubDistrict(params), 'Failed to fetch sub-districts');
  },

  /**
   * @swagger
   * /api/rajaongkir/cost:
   *   post:
   *     summary: Menghitung ongkos kirim
   *     tags: [RajaOngkir]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CostRequest'
   */
  getCost: async (req, res) => {
    const api = getBestAPI();
    const params = req.body;
    
    if (!params.origin || !params.destination || !params.weight) {
      return res.status(400).json({
        status: 400,
        message: 'Origin, destination, and weight are required'
      });
    }
    
    return handleResponse(res, api.getCosts(params), 'Failed to calculate shipping cost');
  },

  // JNE Cost
  getJNECost: async (req, res) => {
    const api = getBestAPI();
    const params = req.body;
    return handleResponse(res, api.getJNECost(params), 'Failed to get JNE cost');
  },

  // TIKI Cost
  getTIKICost: async (req, res) => {
    const api = getBestAPI();
    const params = req.body;
    return handleResponse(res, api.getTIKICost(params), 'Failed to get TIKI cost');
  },

  // POS Cost
  getPOSCost: async (req, res) => {
    const api = getBestAPI();
    const params = req.body;
    return handleResponse(res, api.getPOSCost(params), 'Failed to get POS cost');
  },

  // Pro-only courier costs
  getRPXCost: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'RPX courier requires Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    const params = req.body;
    return handleResponse(res, api.getRPXCost(params), 'Failed to get RPX cost');
  },

  getESLCost: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'ESL courier requires Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    const params = req.body;
    return handleResponse(res, api.getESLCost(params), 'Failed to get ESL cost');
  },

  getPCPCost: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'PCP courier requires Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    const params = req.body;
    return handleResponse(res, api.getPCPCost(params), 'Failed to get PCP cost');
  },

  // Pro-only couriers
  getPanduCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Pandu courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getPanduCost(params), 'Failed to get Pandu cost');
  },

  getWahanaCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Wahana courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getWahanaCost(params), 'Failed to get Wahana cost');
  },

  getSiCepatCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'SiCepat courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getSiCepatCost(params), 'Failed to get SiCepat cost');
  },

  getJNTCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'J&T courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getJNTCost(params), 'Failed to get J&T cost');
  },

  getPahalaCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Pahala courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getPahalaCost(params), 'Failed to get Pahala cost');
  },

  getCahayaCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Cahaya courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getCahayaCost(params), 'Failed to get Cahaya cost');
  },

  getSAPCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'SAP courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getSAPCost(params), 'Failed to get SAP cost');
  },

  getJETCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'JET courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getJETCost(params), 'Failed to get JET cost');
  },

  getIndahCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Indah courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getIndahCost(params), 'Failed to get Indah cost');
  },

  getDSECost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'DSE courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getDSECost(params), 'Failed to get DSE cost');
  },

  getSLISCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'SLIS courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getSLISCost(params), 'Failed to get SLIS cost');
  },

  getFirstCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'First courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getFirstCost(params), 'Failed to get First cost');
  },

  getNCSCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'NCS courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getNCSCost(params), 'Failed to get NCS cost');
  },

  getStarCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Star courier requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getStarCost(params), 'Failed to get Star cost');
  },

  // International methods
  getInterOrigins: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'International features require Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    return handleResponse(res, api.getInterOrigins(), 'Failed to fetch international origins');
  },

  getInterOrigin: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'International features require Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    const { id } = req.params;
    
    if (proAPI) {
      return handleResponse(res, proAPI.getInterOrigin({ id }), 'Failed to fetch international origin');
    } else {
      return handleResponse(res, basicAPI.getInterOrigin(id), 'Failed to fetch international origin');
    }
  },

  getInterDests: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'International features require Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    return handleResponse(res, api.getInterDests(), 'Failed to fetch international destinations');
  },

  getInterDest: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'International features require Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    const { id } = req.params;
    return handleResponse(res, api.getInterDest(id), 'Failed to fetch international destination');
  },

  // International cost methods
  getTIKIInterCost: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'International features require Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    const params = req.body;
    return handleResponse(res, api.getTIKIInterConst(params), 'Failed to get TIKI international cost');
  },

  getPOSInterCost: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'International features require Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    const params = req.body;
    return handleResponse(res, api.getPOSInterCost(params), 'Failed to get POS international cost');
  },

  getJNEInterCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'JNE international requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getJNEInterCost(params), 'Failed to get JNE international cost');
  },

  getSLISInterCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'SLIS international requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getSLISInterCost(params), 'Failed to get SLIS international cost');
  },

  getExpeditoInterCost: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Expedito international requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getExpeditoInterCost(params), 'Failed to get Expedito international cost');
  },

  // Currency
  getCurrency: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Currency feature requires Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    return handleResponse(res, api.getCurrency(), 'Failed to fetch currency rates');
  },

  // Waybill tracking methods
  /**
   * @swagger
   * /api/rajaongkir/waybill/jne:
   *   post:
   *     summary: Melacak pengiriman JNE
   *     tags: [RajaOngkir]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/WaybillRequest'
   */
  getJNEWaybill: async (req, res) => {
    if (!proAPI && !basicAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Waybill tracking requires Basic or Pro API key'
      });
    }
    const api = proAPI || basicAPI;
    const params = req.body;
    return handleResponse(res, api.getJNEWaybill(params), 'Failed to track JNE waybill');
  },

  getPOSWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'POS waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getPOSWaybill(params), 'Failed to track POS waybill');
  },

  getTIKIWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'TIKI waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getTIKIWaybill(params), 'Failed to track TIKI waybill');
  },

  getWahanaWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'Wahana waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getWahanaWaybill(params), 'Failed to track Wahana waybill');
  },

  getJNTWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'J&T waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getJNTWaybill(params), 'Failed to track J&T waybill');
  },

  getRPXWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'RPX waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getRPXWaybill(params), 'Failed to track RPX waybill');
  },

  getSAPWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'SAP waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getSAPWaybill(params), 'Failed to track SAP waybill');
  },

  getSiCepatWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'SiCepat waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getSiCepatWaybill(params), 'Failed to track SiCepat waybill');
  },

  getPCPWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'PCP waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getPCPWaybill(params), 'Failed to track PCP waybill');
  },

  getJETWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'JET waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getJETWaybill(params), 'Failed to track JET waybill');
  },

  getDSEWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'DSE waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getDSEWaybill(params), 'Failed to track DSE waybill');
  },

  getFirstWaybill: async (req, res) => {
    if (!proAPI) {
      return res.status(403).json({
        status: 403,
        message: 'First waybill tracking requires Pro API key'
      });
    }
    const params = req.body;
    return handleResponse(res, proAPI.getFirstWaybill(params), 'Failed to track First waybill');
  }
};