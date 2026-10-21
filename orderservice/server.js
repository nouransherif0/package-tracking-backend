const express = require("express")
const cors = require("cors")
require("dotenv").config()
const db = require("./db")
const routes = require("./routes")

const app = express()
app.use(cors())
app.use(express.json())

app.use("/api/orders", routes)

// test the database connection
db.query("select 1")
  .then(() => console.log("database connected"))
  .catch((err) => console.log("database error:", err.message))

app.listen(process.env.PORT, () => {
   console.log("orderservice running on port " + process.env.PORT)
})
