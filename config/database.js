// config/database.js
const knex = require("knex");
const fs = require("fs");

function createDbConnection(config, isProduction) {
  const connectionConfig = isProduction
    ? {
        user: config.user,
        host: `/cloudsql/${config.connectionName}`,
        database: config.name,
        password: config.password,
        port: config.port,
        statement_timeout: 30000,
      }
    : {
        user: config.user,
        host: config.host,
        database: config.name,
        password: config.password,
        port: config.port,
        // ssl: { ca: fs.readFileSync("server-ca.pem").toString() },
        statement_timeout: 30000,
      };

  // console.log("connectionConfig", connectionConfig);
  
  console.log('Connecting to database:', connectionConfig);

  return knex({
    client: "pg",
    connection: connectionConfig,
    // migrations: {
    //   directory: "./db/migrations",
    //   tableName: "BNI_MIGRATIONS",
    // },
    // seeds: {
    //   directory: "./db/seeds",
    // },
    pool: {
      min: 0,
      max: 25,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
      propagateCreateError: false,
    },
  });
}

module.exports = { createDbConnection };
