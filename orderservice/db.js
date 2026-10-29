const { Pool } = require("pg")
require("dotenv").config()

const db = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : new Pool({
      host: process.env.DBHOST || "localhost",
      port: process.env.DBPORT || 5432,
      user: process.env.DBUSER,
      password: process.env.DBPASSWORD,
      database: process.env.DBNAME
    })

module.exports = db
