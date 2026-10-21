const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const db = require("./db")

const router = express.Router()


// register
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body ;

    if (!name || !email || !phone || !password) {
       return res.status(400).json({ message: "all fields are required" })
    }

    if (!email.includes("@")) {
      return res.status(400).json({ message: "email is not valid" })
    }

    if (isNaN(phone) || phone.length < 10 || phone.length > 15) {
       return res.status(400).json({ message: "phone must be 10 to 15 numbers" })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "password must be at least 6 characters" })
    }

    const check = await db.query("select * from users where email = $1", [email])
    if (check.rows.length > 0) {
       return res.status(400).json({ message: "email already used" })
    }

    const hashed = await bcrypt.hash(password, 10)

    const result = await db.query(
      "insert into users (name, email, phone, password, role) values ($1, $2, $3, $4, 'user') returning id, name, email, phone, role",
      [name, email, phone, hashed]
    )

    res.status(201).json({ message: "user registered", user: result.rows[0] }) ;

  } catch (err) {
     console.log(err)
     res.status(500).json({ message: "server error" })
  }
})


// login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ;

    if (!email || !password) {
       return res.status(400).json({ message: "email and password are required" })
    }

    const result = await db.query("select * from users where email = $1", [email])
    if (result.rows.length == 0) {
      return res.status(401).json({ message: "wrong email or password" })
    }

    const user = result.rows[0]

    const same = await bcrypt.compare(password, user.password)
    if (!same) {
       return res.status(401).json({ message: "wrong email or password" })
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.SECRET,
      { expiresIn: "1d" }
    )

    res.json({
       message: "login done",
       token: token,
       user: { id: user.id, name: user.name, email: user.email, role: user.role }
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "server error" })
  }
})

module.exports = router
