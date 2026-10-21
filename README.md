# package tracking backend

two services: userservice (port 5001) and orderservice (port 5002).
stack: node.js, express, postgres.

## how to run

1. install postgres and create two databases: usersdb and ordersdb
2. create the tables:

```sql
-- in usersdb
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user'
);

-- in ordersdb
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  userid INT,
  pickup VARCHAR(255),
  dropoff VARCHAR(255),
  details TEXT,
  deliverytime VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Pending'
);
```

3. in each service folder (userservice and orderservice) create a `.env` file:

```
PORT=5001            (use 5002 for orderservice)
DBUSER=postgres
DBPASSWORD=your_password
DBNAME=usersdb       (use ordersdb for orderservice)
SECRET=mysecret123
```

4. run in each folder:

```
npm install
npm run dev
```

5. in userservice run `node seed.js` once to add the admin and courier accounts

## test accounts

| role | email | password |
|---|---|---|
| admin | admin@gmail.com | admin123 |
| courier | courier1@gmail.com | courier123 |
| courier | courier2@gmail.com | courier123 |
| user | register a new one | |

## endpoints so far

| method | url | body | who |
|---|---|---|---|
| POST | /api/users/register | name, email, phone, password | anyone |
| POST | /api/users/login | email, password | anyone |
| POST | /api/orders | pickup, dropoff, details, deliverytime | user (token needed) |

send the token as `Authorization: Bearer <token>`.

## notes for team

- `orderservice/auth.js` checks the token and puts the user in `req.user` (id, name, role). reuse it.
- the orders table has no courier column yet, add it.
- status starts as Pending.
