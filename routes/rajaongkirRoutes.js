const express = require('express');
const router = express.Router();
const rajaongkirController = require('../controllers/rajaongkirController');

/**
 * @swagger
 * tags:
 *   name: RajaOngkir
 *   description: API untuk mengecek ongkos kirim menggunakan RajaOngkir
 */

// Province routes
router.get('/provinces', rajaongkirController.getProvinces);
router.get('/provinces/:id', rajaongkirController.getProvince);

// City routes
router.get('/cities', rajaongkirController.getCities);
router.get('/cities/:id', rajaongkirController.getCity);

// Sub-district routes (Pro only)
router.get('/subdistricts', rajaongkirController.getSubDistricts);

// Cost calculation routes
router.post('/cost', rajaongkirController.getCost);
router.post('/cost/jne', rajaongkirController.getJNECost);
router.post('/cost/tiki', rajaongkirController.getTIKICost);
router.post('/cost/pos', rajaongkirController.getPOSCost);

// Pro courier cost routes
router.post('/cost/rpx', rajaongkirController.getRPXCost);
router.post('/cost/esl', rajaongkirController.getESLCost);
router.post('/cost/pcp', rajaongkirController.getPCPCost);
router.post('/cost/pandu', rajaongkirController.getPanduCost);
router.post('/cost/wahana', rajaongkirController.getWahanaCost);
router.post('/cost/sicepat', rajaongkirController.getSiCepatCost);
router.post('/cost/jnt', rajaongkirController.getJNTCost);
router.post('/cost/pahala', rajaongkirController.getPahalaCost);
router.post('/cost/cahaya', rajaongkirController.getCahayaCost);
router.post('/cost/sap', rajaongkirController.getSAPCost);
router.post('/cost/jet', rajaongkirController.getJETCost);
router.post('/cost/indah', rajaongkirController.getIndahCost);
router.post('/cost/dse', rajaongkirController.getDSECost);
router.post('/cost/slis', rajaongkirController.getSLISCost);
router.post('/cost/first', rajaongkirController.getFirstCost);
router.post('/cost/ncs', rajaongkirController.getNCSCost);
router.post('/cost/star', rajaongkirController.getStarCost);

// International routes
router.get('/international/origins', rajaongkirController.getInterOrigins);
router.get('/international/origins/:id', rajaongkirController.getInterOrigin);
router.get('/international/destinations', rajaongkirController.getInterDests);
router.get('/international/destinations/:id', rajaongkirController.getInterDest);
router.post('/international/cost/tiki', rajaongkirController.getTIKIInterCost);
router.post('/international/cost/pos', rajaongkirController.getPOSInterCost);
router.post('/international/cost/jne', rajaongkirController.getJNEInterCost);
router.post('/international/cost/slis', rajaongkirController.getSLISInterCost);
router.post('/international/cost/expedito', rajaongkirController.getExpeditoInterCost);

// Currency route
router.get('/currency', rajaongkirController.getCurrency);

// Waybill tracking routes
router.post('/waybill/jne', rajaongkirController.getJNEWaybill);
router.post('/waybill/pos', rajaongkirController.getPOSWaybill);
router.post('/waybill/tiki', rajaongkirController.getTIKIWaybill);
router.post('/waybill/wahana', rajaongkirController.getWahanaWaybill);
router.post('/waybill/jnt', rajaongkirController.getJNTWaybill);
router.post('/waybill/rpx', rajaongkirController.getRPXWaybill);
router.post('/waybill/sap', rajaongkirController.getSAPWaybill);
router.post('/waybill/sicepat', rajaongkirController.getSiCepatWaybill);
router.post('/waybill/pcp', rajaongkirController.getPCPWaybill);
router.post('/waybill/jet', rajaongkirController.getJETWaybill);
router.post('/waybill/dse', rajaongkirController.getDSEWaybill);
router.post('/waybill/first', rajaongkirController.getFirstWaybill);


router.get('/area/provinsi', rajaongkirController.getProvinceLocal);
router.get('/area/kabupaten', rajaongkirController.getKabupatenLocal);
router.get('/area/kecamatan', rajaongkirController.getKecamatanLocal);
router.get('/area/kelurahan', rajaongkirController.getKelurahanLocal);

// In your routes file
router.post('/postal-code/search', rajaongkirController.getNominatimPostalCode);
router.post('/calculate/domestic-cost', rajaongkirController.calculateDomesticCost);

module.exports = router;