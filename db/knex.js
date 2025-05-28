const { createDbConnection } = require("../config/database");

const isProduction = process.env.NODE_ENV === "production";

// langsung buat koneksi saat require
const knex = createDbConnection({
  connectionName: process.env.CONNECTION_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME,
  host: process.env.HOST_DB,
  port: process.env.DB_PORT,
}, isProduction);

module.exports = knex;
