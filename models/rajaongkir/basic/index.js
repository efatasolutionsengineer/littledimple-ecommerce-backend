var http = require('http')
var request = require('request')
var Promise = require('promise')
var qs = require('querystring') // Added missing require

// Configuration object to store API settings
const config = {
  version: 'basic',
  apiKey: null,
  httpUri: null,
  couriers: {
    JNE: 'jne',
    TIKI: 'tiki',
    POS: 'pos',
    RPX: 'rpx',
    ESL: 'esl',
    PCP: 'pcp'
  }
}

// Helper function to initialize configuration
function init(apiKey) {
  config.apiKey = apiKey
  config.httpUri = 'http://api.rajaongkir.com/' + config.version
}

// Helper function for making requests
function makeRequest(uri, method = 'GET', form = null) {
  return new Promise(function (resolve, reject) {
    const options = {
      uri: uri,
      method: method,
      headers: {
        'key': config.apiKey
      }
    }

    if (method === 'POST') {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      options.form = form
    }

    request(options, function (error, response, body) {
      if (error) return reject(error)
      const result = JSON.parse(body)
      if (result.rajaongkir.status.code !== 200) reject(result)
      resolve(result)
    })
  })
}

module.exports = {
  // Initialize the module with API key
  initialize(apiKey) {
    init(apiKey)
  },

  getProvinces() {
    const uri = config.httpUri + '/province'
    return makeRequest(uri)
  },

  getProvince(id) {
    const uri = config.httpUri + '/province?id=' + id
    return makeRequest(uri)
  },

  getCities(params) {
    const uri = config.httpUri + '/city?' + qs.stringify(params)
    return makeRequest(uri)
  },

  getCity(id) {
    const uri = config.httpUri + '/city?id=' + id
    return makeRequest(uri)
  },

  getCosts(params) {
    const uri = config.httpUri + '/cost'
    return makeRequest(uri, 'POST', params)
  },

  getJNECost(params) {
    const uri = config.httpUri + '/cost'
    params.courier = config.couriers.JNE
    return makeRequest(uri, 'POST', params)
  },

  getTIKICost(params) {
    const uri = config.httpUri + '/cost'
    params.courier = config.couriers.TIKI
    return makeRequest(uri, 'POST', params)
  },

  getPOSCost(params) {
    const uri = config.httpUri + '/cost'
    params.courier = config.couriers.POS
    return makeRequest(uri, 'POST', params)
  },

  getRPXCost(params) {
    const uri = config.httpUri + '/cost'
    params.courier = config.couriers.RPX
    return makeRequest(uri, 'POST', params)
  },

  getESLCost(params) {
    const uri = config.httpUri + '/cost'
    params.courier = config.couriers.ESL
    return makeRequest(uri, 'POST', params)
  },

  getPCPCost(params) {
    const uri = config.httpUri + '/cost'
    params.courier = config.couriers.PCP
    return makeRequest(uri, 'POST', params)
  },

  getInterOrigins() {
    const uri = config.httpUri + '/v2/internationalOrigin'
    return makeRequest(uri)
  },

  getInterOrigin(id) {
    const uri = config.httpUri + '/v2/internationalOrigin?id=' + id
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

  getTIKIInterConst(params) {
    const uri = config.httpUri + '/v2/internationalCost'
    params.courier = config.couriers.TIKI
    return makeRequest(uri, 'POST', params)
  },

  getPOSInterCost(params) {
    const uri = config.httpUri + '/v2/internationalCost'
    params.courier = config.couriers.POS
    return makeRequest(uri, 'POST', params)
  },

  getCurrency() {
    const uri = config.httpUri + '/currency'
    return makeRequest(uri)
  },

  getJNEWaybill(params) {
    const uri = config.httpUri + '/waybill'
    params.courier = config.couriers.JNE
    return makeRequest(uri, 'POST', params)
  }
}