// db/knex.js
require('dotenv').config();

const environment = String(process.env.NODE_ENV) || 'development';
// console.log(`current environment: ${environment}`)
const config = require('../knexfile')[environment];

const knex = require('knex')(config);

// console.log('current environment print: ', {
//     host: config.connection.host,
//     name: config.connection.database,
//     user: config.connection.user,
//     password: config.connection.password,
//     port: config.connection.port,
// });
// console.log(`current environment config: ${JSON.stringify(config.connection)}`)

knex.raw('SELECT 1')
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => console.error('❌ Database connection failed:', err));

module.exports = knex;