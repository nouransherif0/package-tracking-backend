const express = require("express")
const db = require("./db")
const checktoken = require("./auth")

const router = express.Router()



/* get my orders */
router.get("/", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "only users can view their orders" })
    }

    const result = await db.query(
      "select * from orders where userid = $1",
      [req.user.id]
    )

    res.json(result.rows)

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})



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


/* kenzi */

const statuses = ["Pending", "Assigned", "Accepted", "Picked Up", "In Transit", "Delivered", "Cancelled"]

// saves every status change in the history table
async function savehistory(orderid, status, userid) {
  try {
    await db.query(
      "insert into order_status_history (orderid, status, changedby) values ($1, $2, $3)",
      [orderid, status, userid]
    )
  } catch (err) {
    console.log("could not save history:", err.message)
  }
}


/*feature 9: admin manage orders */

// get all orders
router.get("/admin/all", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "only admin can view all orders" })
    }

    const result = await db.query("select * from orders order by id desc")
    res.json(result.rows)

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})


/* feature 10 admin courier assignments */

// get all orders that have a courier
router.get("/admin/assignments", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "only admin can view assignments" })
    }

    const result = await db.query(
      "select * from orders where courierid is not null order by id desc"
    )
    const orders = result.rows

    // add courier name and phone to each order
    const names = {}
    const ids = [...new Set(orders.map((o) => o.courierid))]
    if (ids.length > 0) {
      try {
        const couriers = await db.query(
          "select id, name, phone from users where id = any($1)",
          [ids]
        )
        couriers.rows.forEach((c) => { names[c.id] = { name: c.name, phone: c.phone } })
      } catch (err) {
        console.log("could not get couriers:", err.message)
      }
    }

    orders.forEach((o) => { o.courier = names[o.courierid] || null })

    res.json(orders)

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})


// assign or reassign an order to a courier
router.put("/admin/:id/assign", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "only admin can assign orders" })
    }

    const orderid = Number(req.params.id)
    const courierid = Number(req.body.courierid)

    if (!Number.isInteger(orderid)) {
      return res.status(400).json({ message: "order id is not valid" })
    }
    if (!Number.isInteger(courierid)) {
      return res.status(400).json({ message: "courierid is required" })
    }

    const found = await db.query("select * from orders where id = $1", [orderid])
    if (found.rows.length === 0) {
      return res.status(404).json({ message: "order not found" })
    }

    const order = found.rows[0]
    if (order.status === "Delivered" || order.status === "Cancelled") {
      return res.status(400).json({ message: "cannot assign a " + order.status + " order" })
    }

    // (works when both services share the same database)
    try {
      const courier = await db.query(
        "select id from users where id = $1 and role = 'courier'",
        [courierid]
      )
      if (courier.rows.length === 0) {
        return res.status(400).json({ message: "courier not found" })
      }
    } catch (err) {
      console.log("could not check courier:", err.message)
    }

    const result = await db.query(
      "update orders set courierid = $1, status = 'Assigned' where id = $2 returning *",
      [courierid, orderid]
    )
    await savehistory(orderid, "Assigned", req.user.id)

    res.json({ message: "order assigned", order: result.rows[0] })

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})


/* # 9 admin update and delete  */

// update order status
router.put("/admin/:id", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "only admin can update orders" })
    }

    const orderid = Number(req.params.id)
    if (!Number.isInteger(orderid)) {
      return res.status(400).json({ message: "order id is not valid" })
    }

    const { status } = req.body
    if (!statuses.includes(status)) {
      return res.status(400).json({ message: "status must be one of: " + statuses.join(", ") })
    }

    const result = await db.query(
      "update orders set status = $1 where id = $2 returning *",
      [status, orderid]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "order not found" })
    }

    await savehistory(orderid, status, req.user.id)

    res.json({ message: "order updated", order: result.rows[0] })

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})


// delete order
router.delete("/admin/:id", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "only admin can delete orders" })
    }

    const orderid = Number(req.params.id)
    if (!Number.isInteger(orderid)) {
      return res.status(400).json({ message: "order id is not valid" })
    }

    const result = await db.query("delete from orders where id = $1 returning id", [orderid])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "order not found" })
    }

    // remove its history too
    try {
      await db.query("delete from order_status_history where orderid = $1", [orderid])
    } catch (err) {
      console.log("could not delete history:", err.message)
    }

    res.json({ message: "order deleted" })

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})


/* feature 8: courier updates order status */

router.put("/:id/status", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "courier") {
      return res.status(403).json({ message: "only couriers can update the status" })
    }

    const orderid = Number(req.params.id)
    if (!Number.isInteger(orderid)) {
      return res.status(400).json({ message: "order id is not valid" })
    }

    // each new status and the statuses it can come after
    const allowedfrom = {
      "Picked Up": ["Assigned", "Accepted"],
      "In Transit": ["Picked Up"],
      "Delivered": ["In Transit"]
    }

    const { status } = req.body
    if (!Object.keys(allowedfrom).includes(status)) {
      return res.status(400).json({ message: "status must be Picked Up, In Transit or Delivered" })
    }

    // the order must be assigned to the logged in courier
    const found = await db.query(
      "select * from orders where id = $1 and courierid = $2",
      [orderid, req.user.id]
    )
    if (found.rows.length === 0) {
      return res.status(404).json({ message: "order not found" })
    }

    const order = found.rows[0]
    if (!allowedfrom[status].includes(order.status)) {
      return res.status(400).json({ message: "cannot change status from " + order.status + " to " + status })
    }

    const result = await db.query(
      "update orders set status = $1 where id = $2 returning *",
      [status, orderid]
    )
    await savehistory(orderid, status, req.user.id)

    res.json({ message: "status updated", order: result.rows[0] })

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})

/*  END OF NEW CODE */


router.get("/:id", checktoken, async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "only users can view their orders" })
    }

    const orderid = Number(req.params.id)
    if (!Number.isInteger(orderid)) {
      return res.status(400).json({ message: "order id is not valid" })
    }

    // the order must belong to the logged in user
    const result = await db.query(
      "select * from orders where id = $1 and userid = $2",
      [orderid, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "order not found" })
    }

    const order = result.rows[0]
    order.courier = null

    // if a courier is assigned, add his name and phone
    // (change courierid if your column has another name)
    if (order.courierid) {
      try {
        const courier = await db.query(
          "select name, phone from users where id = $1",
          [order.courierid]
        )
        order.courier = courier.rows[0] || null
      } catch (err) {
        console.log("could not get courier:", err.message)
      }
    }

    res.json(order)

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})

module.exports = router
