const { Pool } = require("pg") ;
const bcrypt = require("bcryptjs")
require("dotenv").config({ path: "./userservice/.env" }) ;

const connectionString = process.env.DATABASE_URL ;

const db = new Pool({
  connectionString,
   ssl: { rejectUnauthorized: false }
}) ;


async function setup() {
  console.log("connecting to database...") ;

  // tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      phone VARCHAR(20),
      password VARCHAR(255),
      role VARCHAR(20) DEFAULT 'user'
    );
  `) ;

  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      userid INT,
      pickup VARCHAR(255),
      dropoff VARCHAR(255),
      details TEXT,
      deliverytime VARCHAR(50),
      status VARCHAR(20) DEFAULT 'Pending'
    );
  `) ;


  const list = [
     ["admin", "admin@gmail.com", "01000000001", "admin123", "admin"],
    ["courier one", "courier1@gmail.com", "01000000002", "courier123", "courier"],
     ["courier two", "courier2@gmail.com", "01000000003", "courier123", "courier"]
  ] ;

  for (let i = 0 ; i < list.length ; i++) {
     const check = await db.query("select * from users where email = $1", [list[i][1]]) ;
     if (check.rows.length === 0) {
        const hashed = await bcrypt.hash(list[i][3], 10) ;
        await db.query(
          "insert into users (name, email, phone, password, role) values ($1, $2, $3, $4, $5)",
          [list[i][0], list[i][1], list[i][2], hashed, list[i][4]]
        ) ;
     }
  }

  console.log("setup done") ;
  await db.end() ;
}

setup().catch((err) => {
   console.log("setup error:", err)
   process.exit(1)
}) ;
