var request = require('request')
var Promise = require('promise')
var qs = require('querystring')

// Configuration object to store API settings
const config = {
  version: 'pro',
  apiKey: null,
  httpUri: null,
  couriers: {
    JNE: 'jne',
    TIKI: 'tiki',
    POS: 'pos',
    RPX: 'rpx',
    ESL: 'esl',
    PCP: 'pcp',
    PANDU: 'pandu',
    WAHANA: 'wahana',
    SICEPAT: 'sicepat',
    JNT: 'jnt',
    PAHALA: 'pahala',
    CAHAYA: 'cahaya',
    SAP: 'sap',
    JET: 'jet',
    INDAH: 'indah',
    DSE: 'dse',
    SLIS: 'slis',
    FIRST: 'first',
    NCS: 'ncs',
    STAR: 'star',
    EXPEDITO: 'expedito'
  }
}

// Helper function to initialize configuration
function init(apiKey) {
  config.apiKey = apiKey
  config.httpUri = 'http://' + config.version + '.rajaongkir.com/api'
}

// Helper function for making requests
function makeRequest(uri, method = 'GET', form = null, extraHeaders = {}) {
  return new Promise(function (resolve, reject) {
    const options = {
      uri: uri,
      method: method,
      headers: {
        'key': config.apiKey,
        ...extraHeaders
      }
    }

    if (method === 'POST') {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      options.form = form
    }

    request(options, function (error, response, body) {
      if (error || typeof body === 'undefined') return reject(error)
      const result = JSON.parse(body)
      if (result.rajaongkir.status.code !== 200) reject(result)
      return resolve(result)
    })
  })
}

// Helper function for courier cost requests
function getCourierCost(params, courierType) {
  const uri = config.httpUri + '/cost'
  params.courier = config.couriers[courierType]
  return makeRequest(uri, 'POST', params)
}

// Helper function for international cost requests
function getInternationalCost(params, courierType) {
  const uri = config.httpUri + '/v2/internationalCost'
  params.courier = config.couriers[courierType]
  return makeRequest(uri, 'POST', params)
}

// Helper function for waybill requests
function getWaybill(params, courierType) {
  const uri = config.httpUri + '/waybill'
  params.courier = config.couriers[courierType]
  return makeRequest(uri, 'POST', params)
}

module.exports = {
  // Initialize the module with API key
  initialize(apiKey) {
    init(apiKey)
  },

  // Province methods
  getProvinces() {
    const uri = config.httpUri + '/province'
    return makeRequest(uri)
  },

  getProvince(id) {
    const uri = config.httpUri + '/province?id=' + id
    return makeRequest(uri)
  },

  // City methods
  getCities() {
    const uri = config.httpUri + '/city'
    return makeRequest(uri)
  },

  getCity(id) {
    const uri = config.httpUri + '/city?id=' + id
    return makeRequest(uri)
  },

  // Sub-district method
  getSubDistrict(params) {
    const uri = config.httpUri + '/subdistrict?' + qs.stringify(params)
    return makeRequest(uri, 'GET', null, { 'Content-Type': 'application/json' })
  },

  // General cost method
  getCosts(params) {
    const uri = config.httpUri + '/cost'
    return makeRequest(uri, 'POST', params)
  },

  // Domestic courier cost methods
  getJNECost(params) {
    return getCourierCost(params, 'JNE')
  },

  getTIKICost(params) {
    return getCourierCost(params, 'TIKI')
  },

  getPOSCost(params) {
    return getCourierCost(params, 'POS')
  },

  getRPXCost(params) {
    return getCourierCost(params, 'RPX')
  },

  getESLCost(params) {
    return getCourierCost(params, 'ESL')
  },

  getPCPCost(params) {
    return getCourierCost(params, 'PCP')
  },

  getPanduCost(params) {
    return getCourierCost(params, 'PANDU')
  },

  getWahanaCost(params) {
    return getCourierCost(params, 'WAHANA')
  },

  getSiCepatCost(params) {
    return getCourierCost(params, 'SICEPAT')
  },

  getJNTCost(params) {
    return getCourierCost(params, 'JNT')
  },

  getPahalaCost(params) {
    return getCourierCost(params, 'PAHALA')
  },

  getCahayaCost(params) {
    return getCourierCost(params, 'CAHAYA')
  },

  getSAPCost(params) {
    return getCourierCost(params, 'SAP')
  },

  getJETCost(params) {
    return getCourierCost(params, 'JET')
  },

  getIndahCost(params) {
    return getCourierCost(params, 'INDAH')
  },

  getDSECost(params) {
    return getCourierCost(params, 'DSE')
  },

  getSLISCost(params) {
    return getCourierCost(params, 'SLIS')
  },

  getFirstCost(params) {
    return getCourierCost(params, 'FIRST')
  },

  getNCSCost(params) {
    return getCourierCost(params, 'NCS')
  },

  getStarCost(params) {
    return getCourierCost(params, 'STAR')
  },

  // International origin and destination methods
  getInterOrigins() {
    const uri = config.httpUri + '/v2/internationalOrigin'
    return makeRequest(uri)
  },

  getInterOrigin(params) {
    const uri = config.httpUri + '/v2/internationalOrigin?' + qs.stringify(params)
    return makeRequest(uri)
  },

  getInterDests() {
    const uri = config.httpUri + '/v2/internationalDestination'
    return makeRequest(uri)
  },

  getInterDest(id) {
    const uri = config.httpUri + '/v2/internationalDestination?id=' + id
    return makeRequest(uri)
  },

  // International cost methods
  getTIKIInterConst(params) {
    return getInternationalCost(params, 'TIKI')
  },

  getPOSInterCost(params) {
    return getInternationalCost(params, 'POS')
  },

  getJNEInterCost(params) {
    return getInternationalCost(params, 'JNE')
  },

  getSLISInterCost(params) {
    return getInternationalCost(params, 'SLIS')
  },

  getExpeditoInterCost(params) {
    return getInternationalCost(params, 'EXPEDITO')
  },

  // Currency method
  getCurrency() {
    const uri = config.httpUri + '/currency'
    return makeRequest(uri)
  },

  // Waybill methods
  getJNEWaybill(params) {
    return getWaybill(params, 'JNE')
  },

  getPOSWaybill(params) {
    return getWaybill(params, 'POS')
  },

  getTIKIWaybill(params) {
    return getWaybill(params, 'TIKI')
  },

  getWahanaWaybill(params) {
    return getWaybill(params, 'WAHANA')
  },

  getJNTWaybill(params) {
    return getWaybill(params, 'JNT')
  },

  getRPXWaybill(params) {
    return getWaybill(params, 'RPX')
  },

  getSAPWaybill(params) {
    return getWaybill(params, 'SAP')
  },

  getSiCepatWaybill(params) {
    return getWaybill(params, 'SICEPAT')
  },

  getPCPWaybill(params) {
    return getWaybill(params, 'PCP')
  },

  getJETWaybill(params) {
    return getWaybill(params, 'JET')
  },

  getDSEWaybill(params) {
    return getWaybill(params, 'DSE')
  },

  getFirstWaybill(params) {
    return getWaybill(params, 'FIRST')
  }
}