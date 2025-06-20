// knexfile.js
require('dotenv').config();
module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: String(process.env.DB_HOST || 'localhost'),
      database: String(process.env.DB_NAME_DEV || 'cp'),
      user: String(process.env.DB_USER || 'postgres'),
      password: String(process.env.DB_PASSWORD_DEV || 'postgres'),
      port: process.env.DB_PORT || 5432,
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },
  production: {
    client: 'postgresql',
    connection: {
      host: String(process.env.DB_HOST || 'localhost'),
      database: String(process.env.DB_NAME || 'cp'),
      user: String(process.env.DB_USER || 'postgres'),
      password: String(process.env.DB_PASSWORD || 'postgres'),
      port: process.env.DB_PORT || 5432,
      ssl: { rejectUnauthorized: false }
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './db/migrations'
    }
  }
};