const jwt = require("jsonwebtoken")

// checks the token and puts the user info in req.user
function checktoken(req, res, next) {
  const header = req.headers["authorization"] ;
  if (!header) {
     return res.status(401).json({ message: "no token" })
  }

  const token = header.split(" ")[1] ;
  try {
    const data = jwt.verify(token, process.env.SECRET)
    req.user = data
    next()
  } catch (err) {
    return res.status(401).json({ message: "token is not valid" })
  }
}

module.exports = checktoken
