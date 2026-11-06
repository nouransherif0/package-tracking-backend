# package tracking backend

two microservices: userservice (port 5001) and orderservice (port 5002)

## how to run

1. setup the database:
```bash
node setup-db.js
```

2. run user service:
```bash
cd userservice
npm install
npm run dev
```

3. run order service (in another terminal):
```bash
cd orderservice
npm install
npm run dev
```

### test accounts
- admin: admin@gmail.com / admin123
- courier: courier1@gmail.com / courier123
- courier: courier2@gmail.com / courier123
- user: can register from the app
