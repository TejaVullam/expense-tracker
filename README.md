# Expense Tracker

A minimal MERN expense tracker using React/Vite, Express, Mongoose, MongoDB, and Recharts.

## Deployed application

- Frontend: https://expense-tracker-rd24ghmqk-tejavullams-projects.vercel.app
- Backend API: https://expense-tracker-dpx5.onrender.com
- Database: MongoDB Atlas (`expense_tracker`)

## Prerequisites

- Node.js 18 or newer
- A free MongoDB Atlas cluster

## Run the application

1. Create a free MongoDB Atlas cluster, database user, and network access rule:
   - In Atlas, create an M0 free cluster.
   - Create a database user with read/write access.
   - Under Network Access, add your current IP address. For local development only, `0.0.0.0/0` also works but allows connections from anywhere.
2. Copy the connection string from Atlas and create `backend/.env` from `backend/.env.example`.
   Replace `<username>`, `<password>`, and `<cluster-url>` with your Atlas values. Keep the URI private and URL-encode special characters in the username or password.
   The database name must remain `expense_tracker`, for example:

```text
MONGO_URI=mongodb+srv://my-user:my-password@cluster0.example.mongodb.net/expense_tracker?retryWrites=true&w=majority
```

2. Install and start the backend:

```powershell
cd backend
npm install
npm start
```

4. In a second terminal, install and start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend uses `http://localhost:5000/api` by default. Set `VITE_API_URL` before `npm run dev` if the backend is hosted elsewhere.

The backend is intentionally kept in one application file: `backend/server.js` contains the Express setup, Mongoose schema, database connection, validation, and all transaction endpoints.

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

Tests use the isolated database `expense_tracker_test` by default and never touch the application database. With Atlas, set `MONGO_TEST_URI` to a separate database on the same cluster before running:

```powershell
cd backend
npm test
```

To use another isolated MongoDB database, set `MONGO_TEST_URI`, for example:

```powershell
$env:MONGO_TEST_URI="mongodb+srv://<username>:<password>@<cluster-url>/expense_tracker_test?retryWrites=true&w=majority"
npm test
```

Build the frontend with:

```powershell
cd frontend
npm run build
```
