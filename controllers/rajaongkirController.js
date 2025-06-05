const RajaOngkir = require('../models/rajaongkir');
const knex = require('../db/knex');

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

async function getNominatimPostalCode(kelurahanName, city, country = 'Indonesia'){
  try {
    const query = `${kelurahanName}, ${city}, ${country}`;
    const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`
    );
    const data = await response.json();
    if (data.length > 0) {
      return data[0].address?.postcode || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching from Nominatim:', error);
    return null;
  }
};

module.exports = {
  // /**
  //  * @swagger
  //  * /api/rajaongkir/provinces:
  //  *   get:
  //  *     summary: Mendapatkan daftar provinsi
  //  *     tags: [RajaOngkir]
  //  *     responses:
  //  *       200:
  //  *         description: Daftar provinsi berhasil diambil
  //  *         content:
  //  *           application/json:
  //  *             schema:
  //  *               type: object
  //  *               properties:
  //  *                 status:
  //  *                   type: integer
  //  *                 message:
  //  *                   type: string
  //  *                 data:
  //  *                   type: array
  //  *                   items:
  //  *                     $ref: '#/components/schemas/Province'
  //  */
  getProvinces: async (req, res) => {
    const api = getBestAPI();
    return handleResponse(res, api.getProvinces(), 'Failed to fetch provinces');
  },

  // /**
  //  * @swagger
  //  * /api/rajaongkir/provinces/{id}:
  //  *   get:
  //  *     summary: Mendapatkan detail provinsi berdasarkan ID
  //  *     tags: [RajaOngkir]
  //  *     parameters:
  //  *       - in: path
  //  *         name: id
  //  *         required: true
  //  *         schema:
  //  *           type: string
  //  *         description: ID provinsi
  //  */
  getProvince: async (req, res) => {
    const api = getBestAPI();
    const { id } = req.params;
    return handleResponse(res, api.getProvince(id), 'Failed to fetch province');
  },

  // /**
  //  * @swagger
  //  * /api/rajaongkir/cities:
  //  *   get:
  //  *     summary: Mendapatkan daftar kota/kabupaten
  //  *     tags: [RajaOngkir]
  //  *     parameters:
  //  *       - in: query
  //  *         name: province
  //  *         schema:
  //  *           type: string
  //  *         description: ID provinsi untuk filter kota
  //  */
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

  // /**
  //  * @swagger
  //  * /api/rajaongkir/cities/{id}:
  //  *   get:
  //  *     summary: Mendapatkan detail kota berdasarkan ID
  //  *     tags: [RajaOngkir]
  //  *     parameters:
  //  *       - in: path
  //  *         name: id
  //  *         required: true
  //  *         schema:
  //  *           type: string
  //  *         description: ID kota
  //  */
  getCity: async (req, res) => {
    const api = getBestAPI();
    const { id } = req.params;
    return handleResponse(res, api.getCity(id), 'Failed to fetch city');
  },

  // /**
  //  * @swagger
  //  * /api/rajaongkir/subdistricts:
  //  *   get:
  //  *     summary: Mendapatkan daftar kecamatan (Pro only)
  //  *     tags: [RajaOngkir]
  //  *     parameters:
  //  *       - in: query
  //  *         name: city
  //  *         required: true
  //  *         schema:
  //  *           type: string
  //  *         description: ID kota
  //  */
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

  // /**
  //  * @swagger
  //  * /api/rajaongkir/cost:
  //  *   post:
  //  *     summary: Menghitung ongkos kirim
  //  *     tags: [RajaOngkir]
  //  *     requestBody:
  //  *       required: true
  //  *       content:
  //  *         application/json:
  //  *           schema:
  //  *             $ref: '#/components/schemas/CostRequest'
  //  */
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
  // /**
  //  * @swagger
  //  * /api/rajaongkir/waybill/jne:
  //  *   post:
  //  *     summary: Melacak pengiriman JNE
  //  *     tags: [RajaOngkir]
  //  *     requestBody:
  //  *       required: true
  //  *       content:
  //  *         application/json:
  //  *           schema:
  //  *             $ref: '#/components/schemas/WaybillRequest'
  //  */
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
  },
  
  /**
  * @swagger
  * /api/rajaongkir/area/provinsi:
  *   get:
  *     summary: Get all provinces from local database
  *     tags: [RajaOngkir]
  *     responses:
  *       200:
  *         description: Provinces retrieved successfully
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
  *       404:
  *         description: No provinces found
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
  *                 message:
  *                   type: string
  *                 data:
  *                   type: null
  */
  getProvinceLocal: async (req, res) => {
      try {
          const provinsiList = await knex('provinsi')
              .select('id', 'name')
              .orderBy('id');
          
          if (provinsiList.length === 0) {
              return res.status(404).json({
                  status: 404,
                  message: 'Data provinsi tidak ditemukan',
                  data: null
              });
          }

          return res.status(200).json({
              status: 200,
              message: 'Data provinsi berhasil didapatkan',
              data: provinsiList
          });

      } catch (err) {
          console.log(`getProvinceLocal-500: ${err}`);
          return res.status(500).json({
              status: 500,
              message: 'Terjadi kesalahan saat mendapatkan data provinsi',
              data: null
          });
      }
  },

  /**
   * @swagger
   * /api/rajaongkir/area/kabupaten/{id_provinsi}:
   *   get:
   *     summary: Get all kabupaten by province ID from local database
   *     tags: [RajaOngkir]
   *     parameters:
   *       - in: path
   *         name: id_provinsi
   *         required: true
   *         schema:
   *           type: integer
   *         description: Province ID
   *         example: 1
   *     responses:
   *       200:
   *         description: Kabupaten retrieved successfully
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
   *                     $ref: '#/components/schemas/Kabupaten'
   *       400:
   *         description: Bad request - missing or invalid id_provinsi
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
   *                   type: null
   *       404:
   *         description: No kabupaten found
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
   *                 message:
   *                   type: string
   */
  getKabupatenLocal: async (req, res) => {
      try {
          const { id_provinsi } = req.query;
          
          // Validate required parameter
          if (!id_provinsi) {
              return res.status(400).json({
                  status: 400,
                  message: 'Parameter id_provinsi wajib diisi',
                  data: null
              });
          }

          // Validate id_provinsi is a number
          if (isNaN(id_provinsi)) {
              return res.status(400).json({
                  status: 400,
                  message: 'Parameter id_provinsi harus berupa angka',
                  data: null
              });
          }

          const kabupatenList = await knex('kabupaten')
              .select('id', 'name', 'id_provinsi')
              .where('id_provinsi', id_provinsi)
              .orderBy('id');
          
          if (kabupatenList.length === 0) {
              return res.status(404).json({
                  status: 404,
                  message: 'Data kabupaten tidak ditemukan untuk provinsi tersebut',
                  data: null
              });
          }

          return res.status(200).json({
              status: 200,
              message: 'Data kabupaten berhasil didapatkan',
              data: kabupatenList
          });

      } catch (err) {
          console.log(`getKabupatenLocal-500: ${err}`);
          return res.status(500).json({
              status: 500,
              message: 'Terjadi kesalahan saat mendapatkan data kabupaten',
              });
      }
  },

  /**
   * @swagger
   * /api/rajaongkir/area/kecamatan/{id_kabupaten}:
   *   get:
   *     summary: Get all kecamatan by kabupaten ID from local database
   *     tags: [RajaOngkir]
   *     parameters:
   *       - in: path
   *         name: id_kabupaten
   *         required: true
   *         schema:
   *           type: integer
   *         description: Kabupaten ID
   *         example: 1
   *     responses:
   *       200:
   *         description: Kecamatan retrieved successfully
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
   *                     $ref: '#/components/schemas/Kecamatan'
   *       400:
   *         description: Bad request - missing or invalid id_provinsi
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
   *                   type: null
   *       404:
   *         description: No kecamatan found
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
   *                 message:
   *                   type: string
   */
  getKecamatanLocal: async (req, res) => {
      try {
          const { id_kabupaten } = req.query;
          
          // Validate required parameter
          if (!id_kabupaten) {
              return res.status(400).json({
                  status: 400,
                  message: 'Parameter id_kabupaten wajib diisi',
                  });
          }

          // Validate id_kabupaten is a number
          if (isNaN(id_kabupaten)) {
              return res.status(400).json({
                  status: 400,
                  message: 'Parameter id_kabupaten harus berupa angka',
                  data: null
              });
          }

          const kecamatanList = await knex('kecamatan')
              .select('id', 'name', 'id_kabupaten')
              .where('id_kabupaten', id_kabupaten)
              .orderBy('id');
          
          if (kecamatanList.length === 0) {
              return res.status(404).json({
                  status: 404,
                  message: 'Data kecamatan tidak ditemukan untuk kabupaten tersebut',
                  data: null
              });
          }

          return res.status(200).json({
              status: 200,
              message: 'Data kecamatan berhasil didapatkan',
              data: kecamatanList
          });

      } catch (err) {
          console.log(`getKecamatanLocal-500: ${err}`);
          return res.status(500).json({
              status: 500,
              message: 'Terjadi kesalahan saat mendapatkan data kecamatan',
              data: null
          });
      }
  },

  /**
   * @swagger
   * /api/rajaongkir/area/kelurahan/{id_kecamatan}:
   *   get:
   *     summary: Get all kelurahan by kelurahan ID from local database
   *     tags: [RajaOngkir]
   *     parameters:
   *       - in: path
   *         name: id_kecamatan
   *         required: true
   *         schema:
   *           type: integer
   *         description: Kelurahan ID
   *         example: 1
   *     responses:
   *       200:
   *         description: Kelurahan retrieved successfully
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
   *                     $ref: '#/components/schemas/Kelurahan'
   *       400:
   *         description: Bad request - missing or invalid id_provinsi
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
   *                   type: null
   *       404:
   *         description: No kelurahan found
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
   *                 message:
   *                   type: string
   */
  getKelurahanLocal: async (req, res) => {
      try {
          const { id_kecamatan } = req.query;
          
          // Validate required parameter
          if (!id_kecamatan) {
              return res.status(400).json({
                  status: 400,
                  message: 'Parameter id_kecamatan wajib diisi',
                  data: null
              });
          }

          // Validate id_kecamatan is a number
          if (isNaN(id_kecamatan)) {
              return res.status(400).json({
                  status: 400,
                  message: 'Parameter id_kecamatan harus berupa angka',
                  data: null
              });
          }

          const kelurahanList = await knex('kelurahan')
              .select('id', 'name', 'id_kecamatan')
              .where('id_kecamatan', id_kecamatan)
              .orderBy('id');
          
          if (kelurahanList.length === 0) {
              return res.status(404).json({
                  status: 404,
                  message: 'Data kelurahan tidak ditemukan untuk kecamatan tersebut',
                  data: null
              });
          }

          return res.status(200).json({
              status: 200,
              message: 'Data kelurahan berhasil didapatkan',
              data: kelurahanList
          });

      } catch (err) {
          console.log(`getKelurahanLocal-500: ${err}`);
          return res.status(500).json({
              status: 500,
              message: 'Terjadi kesalahan saat mendapatkan data kelurahan',
              });
      }
  },

  getNominatimPostalCode: async (req, res) => {
    try {
        const { subdistrict, district, city, state, country = 'Indonesia' } = req.body;
        
        // Validate required parameters
        if (!subdistrict || !district || !city || !state) {
            return res.status(400).json({
                status: 400,
                message: 'Parameter subdistrict, district, city, dan state wajib diisi',
                data: null
            });
        }

        // Validate parameters are strings
        if (typeof subdistrict !== 'string' || typeof district !== 'string' || typeof city !== 'string' || typeof state !== 'string') {
            return res.status(400).json({
                status: 400,
                message: 'Parameter subdistrict, district, city, dan state harus berupa string',
                data: null
            });
        }

        // Build search query
        const query = `${subdistrict}, ${city}, ${state}, ${country}`;
        
        // Call Nominatim API
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1`,
            {
                headers: {
                    'User-Agent': 'YourAppName/1.0'  // Nominatim requires User-Agent
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.length === 0) {
            return res.status(404).json({
                status: 404,
                message: 'Kode pos tidak ditemukan untuk lokasi tersebut',
                });
        }

        const locationData = data[0];
        const postalCode = locationData.address?.postcode || null;

        if (!postalCode) {
            return res.status(404).json({
                status: 404,
                message: 'Kode pos tidak tersedia untuk lokasi tersebut',
                });
        }

        return res.status(200).json({
            status: 200,
            message: 'Kode pos berhasil ditemukan',
            data: {
                query: query,
                postal_code: postalCode,
                coordinates: {
                    latitude: locationData.lat,
                    longitude: locationData.lon
                },
                full_address: locationData.address,
                display_name: locationData.display_name
            }
        });

    } catch (err) {
        console.log(`getNominatimPostalCode-500: ${err}`);
        return res.status(500).json({
            status: 500,
            message: 'Terjadi kesalahan saat mencari kode pos',
            data: null
        });
    }
  },

  /**
   * @swagger
   * /api/rajaongkir/calculate/domestic-cost:
   *   post:
   *     summary: Menghitung ongkos kirim domestik berdasarkan nama kota/kabupaten
   *     tags: [RajaOngkir]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - origin
   *               - destination
   *               - weight
   *             properties:
   *               origin:
   *                 type: string
   *                 example: "Jakarta"
   *                 description: "Nama kota/kabupaten asal"
   *               destination:
   *                 type: string
   *                 example: "Bandung"
   *                 description: "Nama kota/kabupaten tujuan"
   *               weight:
   *                 type: integer
   *                 example: 1000
   *                 description: "Berat paket dalam gram"
   *     responses:
   *       200:
   *         description: Berhasil menghitung ongkos kirim
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
   *                   example: "Success"
   *                 data:
   *                   type: object
   *                   description: "Data ongkos kirim"
   *       404:
   *         description: Kota asal atau tujuan tidak ditemukan
   *       500:
   *         description: Server error
   */
  calculateDomesticCost: async (req, res) => {
    try {
      const { subdistrict, district, city, state, postal_code, weight } = req.body;

      const originData = await knex("general_settings")
      .select('main_toko_provinsi as province_name', 'main_toko_kabupaten as city_name', 'main_toko_kecamatan as district_name', 'main_toko_kelurahan as subdistrict_name', 'main_toko_kodepos as zip_code')
      .first();
      
      // Validate required fields
      if (!subdistrict || !district || !city || !state || !postal_code || !weight) {
        return res.status(400).json({
          status: 400,
          message: 'subdistrict, district, city, state, postal_code, and weight are required'
        });
      }

      const destination = `${subdistrict}, ${district}, ${city}, ${state}, ${postal_code}`;

      let errorMessages = [];

      // Helper function for making API calls
      const makeApiCall = async (url, options = {}) => {
        const response = await fetch(url, {
          headers: {
            'key': process.env.RAJAONGKIR_KEY,
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
      };

      // Get origin data
      // let data_origin = null;
      // try {
      //   const response_origin = await makeApiCall(
      //     `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(origin)}&limit=5&offset=0`
      //   );
        
      //   if (response_origin.data && response_origin.data.length > 0) {
      //     data_origin = response_origin.data[0];
      //   } else {
      //     errorMessages.push('[origin not found]');
      //   }
      // } catch (error) {
      //   console.error('Error fetching origin:', error);
      //   errorMessages.push('[origin not found]');
      // }

      // Get destination data
      let data_destination = null;
      try {
        const response_destination = await makeApiCall(
            `https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=${encodeURIComponent(destination)}&limit=5&offset=0`
        );
        
        if (response_destination.data && response_destination.data.length > 0) {
            
          // Filter data based on subdistrict and postal_code
            const matchedDestination = response_destination.data.find((data) => {
              const subdistrictMatch = data.subdistrict_name?.toLowerCase() === subdistrict?.toLowerCase();
              const postalCodeMatch = data.zip_code?.toString() === postal_code?.toString();
              return subdistrictMatch && postalCodeMatch;
            });
            
            if (matchedDestination) {
              data_destination = matchedDestination;
            } else {
                // errorMessages.push('[destination not found - no match for subdistrict and postal code]');
              data_destination = response_destination.data[0];
            }
        } else {
            errorMessages.push('[destination not found]');
        }
      } catch (error) {
          console.error('Error fetching destination:', error);
          errorMessages.push('[destination not found]');
      }

      // If there are errors, return them
      if (errorMessages.length > 0) {
        return res.status(404).json({
          status: 404,
          message: errorMessages.join(' ')
        });
      }

      // Calculate shipping cost
      try {
        const costResponse = await fetch('https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost', {
          method: 'POST',
          headers: {
            'key': process.env.RAJAONGKIR_KEY,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'origin': process.env.ID_ORIGIN, // 
            'destination': data_destination.id,
            'weight': weight.toString(),
            'courier': 'jne:sicepat:ide:sap:jnt:ninja:tiki:lion:anteraja:pos:ncs:rex:rpx:sentral:star:wahana:dse',
            'price': 'lowest'
          })
        });

        if (!costResponse.ok) {
          throw new Error(`HTTP error! status: ${costResponse.status}`);
        }

        const costData = await costResponse.json();
        
        return res.status(200).json({
          status: 200,
          message: 'Success',
          data: {
            origin: {
              id: parseInt(process.env.ID_ORIGIN),
              label: `${originData.subdistrict_name}, ${originData.district_name}, ${originData.city_name}, ${originData.province_name}, ${originData.zip_code}`,
              province_name: originData.province_name,
              city_name: originData.city_name,
              district_name: originData.district_name,
              subdistrict_name: originData.subdistrict_name,
              zip_code: originData.zip_code
            },
            destination: data_destination,
            weight: weight,
            shipping_costs: costData
          }
        });

      } catch (error) {
        console.error('Error calculating shipping cost:', error);
        return res.status(500).json({
          status: 500,
          message: 'Failed to calculate shipping cost',
          error: error.message
        });
      }

    } catch (error) {
      console.error('Error in calculateDomesticCost:', error);
      return res.status(500).json({
        status: 500,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};