const { Pool } = require("pg")
require("dotenv").config()

const db = new Pool({
  host: "localhost",
  port: 5432,
  user: process.env.DBUSER,
  password: process.env.DBPASSWORD,
  database: process.env.DBNAME
})

module.exports = db
