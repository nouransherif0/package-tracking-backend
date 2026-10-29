const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "./userservice/.env" });

const connectionString = process.env.DATABASE_URL;

const db = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  console.log("Connecting to Neon database...");

  // 1. Create tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      phone VARCHAR(20),
      password VARCHAR(255),
      role VARCHAR(20) DEFAULT 'user'
    );
  `);
  console.log("✓ Table 'users' verified/created");

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
  `);
  console.log("✓ Table 'orders' verified/created");

  // 2. Seed default users
  const list = [
    ["admin", "admin@gmail.com", "01000000001", "admin123", "admin"],
    ["courier one", "courier1@gmail.com", "01000000002", "courier123", "courier"],
    ["courier two", "courier2@gmail.com", "01000000003", "courier123", "courier"]
  ];

  for (let i = 0; i < list.length; i++) {
    const check = await db.query("SELECT * FROM users WHERE email = $1", [list[i][1]]);
    if (check.rows.length === 0) {
      const hashed = await bcrypt.hash(list[i][3], 10);
      await db.query(
        "INSERT INTO users (name, email, phone, password, role) VALUES ($1, $2, $3, $4, $5)",
        [list[i][0], list[i][1], list[i][2], hashed, list[i][4]]
      );
      console.log(`✓ Seeded user: ${list[i][1]} (${list[i][4]})`);
    } else {
      console.log(`- User already exists: ${list[i][1]}`);
    }
  }

  // 3. Verify
  const userCount = await db.query("SELECT count(*) FROM users");
  console.log(`Total users in database: ${userCount.rows[0].count}`);

  await db.end();
  console.log("Setup completed successfully!");
}

setup().catch((err) => {
  console.error("Setup error:", err);
  process.exit(1);
});

