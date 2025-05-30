var starter = require('./starter'),
  basic = require('./basic'),
  pro = require('./pro'),
  fs = require('fs')

module.exports = {
  Starter: function (apiKey) {
    if (!apiKey) throw new Error('You must provide RajaOngkir API key')
    starter.initialize(apiKey)
    return starter
  },
  
  Basic: function (apiKey) {
    if (!apiKey) throw new Error('You must provide RajaOngkir API key')
    basic.initialize(apiKey)
    return basic
  },
  
  Pro: function (apiKey) {
    if (!apiKey) throw new Error('You must provide RajaOngkir API key')
    pro.initialize(apiKey)
    return pro
  },

  // Alternative direct access methods (optional)
  createStarter: function (apiKey) {
    if (!apiKey) throw new Error('You must provide RajaOngkir API key')
    starter.initialize(apiKey)
    return starter
  },

  createBasic: function (apiKey) {
    if (!apiKey) throw new Error('You must provide RajaOngkir API key')
    basic.initialize(apiKey)
    return basic
  },

  createPro: function (apiKey) {
    if (!apiKey) throw new Error('You must provide RajaOngkir API key')
    pro.initialize(apiKey)
    return pro
  }
}