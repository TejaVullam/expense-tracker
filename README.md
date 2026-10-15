# Expense Tracker

A minimal MERN expense tracker using React/Vite, Express, Mongoose, MongoDB, and Recharts.

## Prerequisites

- Node.js 18 or newer
- MongoDB running locally

## Run the application

1. Start MongoDB and create `backend/.env` from `backend/.env.example`.
2. Install and start the backend:

```powershell
cd backend
npm install
npm start
```

3. In a second terminal, install and start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend uses `http://localhost:5000/api` by default. Set `VITE_API_URL` before `npm run dev` if the backend is hosted elsewhere.

## API

- `GET /api/transactions?month=2026-10` - list transactions for a month, or all transactions without `month`
- `POST /api/transactions` - create a transaction:

```json
{"amount":250,"type":"expense","category":"Food","date":"2026-10-10","paymentMethod":"UPI","note":"Lunch"}
```

- `PUT /api/transactions/:id` - update supplied transaction fields
- `DELETE /api/transactions/:id` - delete a transaction
- `GET /api/transactions/summary?month=2026-10` - calculate income, expenses, balance, and category breakdown

All month values must be `YYYY-MM`. The database is `expense_tracker` and the only collection used is `transactions`.

## Tests

Tests use the isolated database `expense_tracker_test` by default and never touch the application database. Ensure MongoDB is running, then run:

```powershell
cd backend
npm test
```

To use another isolated MongoDB database, set `MONGO_TEST_URI`, for example:

```powershell
$env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/expense_tracker_test"
npm test
```

Build the frontend with:

```powershell
cd frontend
npm run build
```
