const express = require("express")
const db = require("./db")
const checktoken = require("./auth")

const router = express.Router()


// create order
router.post("/", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "only users can create orders" })
    }

    const { pickup, dropoff, details, deliverytime } = req.body ;

    if (!pickup || !dropoff || !details || !deliverytime) {
       return res.status(400).json({ message: "all fields are required" })
    }

    if (new Date(deliverytime) < new Date()) {
      return res.status(400).json({ message: "delivery time must be in the future" })
    }

    const result = await db.query(
      "insert into orders (userid, pickup, dropoff, details, deliverytime, status) values ($1, $2, $3, $4, $5, 'Pending') returning *",
      [req.user.id, pickup, dropoff, details, deliverytime]
    )

    res.status(201).json({ message: "order created", order: result.rows[0] }) ;

  } catch (err) {
     console.log(err)
     res.status(500).json({ message: "server error" })
  }
})

module.exports = router
