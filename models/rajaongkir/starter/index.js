var http = require('http')
var request = require('request')
var Promise = require('promise')

// Configuration object to store API settings
const config = {
  version: 'starter',
  apiKey: null,
  httpUri: null,
  couriers: {
    JNE: 'jne',
    TIKI: 'tiki',
    POS: 'pos'
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

// Helper function for courier cost requests
function getCourierCost(params, courierType) {
  const uri = config.httpUri + '/cost'
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

  // Courier cost methods
  getJNECost(params) {
    return getCourierCost(params, 'JNE')
  },

  getTIKICost(params) {
    return getCourierCost(params, 'TIKI')
  },

  getPOSCost(params) {
    return getCourierCost(params, 'POS')
  }
}