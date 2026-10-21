const bcrypt = require("bcryptjs")
const db = require("./db")

async function addusers(){

  const list = [
    ["admin", "admin@gmail.com", "01000000001", "admin123", "admin"],
    ["courier one", "courier1@gmail.com", "01000000002", "courier123", "courier"],
    ["courier two", "courier2@gmail.com", "01000000003", "courier123", "courier"]
  ] ;

  for (let i = 0 ; i < list.length ; i++) {
     const check = await db.query("select * from users where email = $1", [list[i][1]])

     if (check.rows.length == 0) {
        const hashed = await bcrypt.hash(list[i][3], 10) ;

        await db.query(
          "insert into users (name, email, phone, password, role) values ($1, $2, $3, $4, $5)",
          [list[i][0], list[i][1], list[i][2], hashed, list[i][4]]
        )
     }
  }

  console.log("users added")
  process.exit()
}

addusers() ;
