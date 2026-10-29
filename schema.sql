-- Database schema for Package Tracker
-- Run this in your Supabase or Neon SQL Editor:

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  userid INT,
  pickup VARCHAR(255),
  dropoff VARCHAR(255),
  details TEXT,
  deliverytime VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Pending'
);

