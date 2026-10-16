require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const fields = ['amount', 'type', 'category', 'date', 'paymentMethod', 'note'];
const types = ['income', 'expense'];
const paymentMethods = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: [Number.MIN_VALUE, 'Amount must be greater than zero'] },
  type: { type: String, required: true, enum: types },
  category: { type: String, required: true, trim: true, minlength: [1, 'Category is required'] },
  date: { type: Date, required: true },
  paymentMethod: { type: String, required: true, enum: paymentMethods },
  note: { type: String, trim: true },
}, { timestamps: true, collection: 'transactions' });

transactionSchema.path('amount').validate(Number.isFinite, 'Amount must be a finite number');
const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

app.use(cors());
app.use(express.json());

function monthRange(month) {
  if (month === undefined) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const error = new Error('Month must use YYYY-MM format with a valid month');
    error.status = 400;
    throw error;
  }
  const [year, monthNumber] = month.split('-').map(Number);
  return { $gte: new Date(Date.UTC(year, monthNumber - 1, 1)), $lt: new Date(Date.UTC(year, monthNumber, 1)) };
}

function dateFilter(month) {
  const range = monthRange(month);
  return range ? { date: range } : {};
}

function validatePayload(payload, partial = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'Request body must be a JSON object';
  const unknown = Object.keys(payload).find((key) => !fields.includes(key));
  if (unknown) return `Unknown field: ${unknown}`;
  if (!partial) {
    const required = ['amount', 'type', 'category', 'date', 'paymentMethod'];
    const missing = required.find((field) => payload[field] === undefined || payload[field] === null);
    if (missing) return `${missing} is required`;
  }
  if (payload.amount !== undefined && (typeof payload.amount !== 'number' || !Number.isFinite(payload.amount) || payload.amount <= 0)) return 'Amount must be a finite number greater than zero';
  if (payload.type !== undefined && !types.includes(payload.type)) return 'Type must be income or expense';
  if (payload.category !== undefined && (typeof payload.category !== 'string' || !payload.category.trim())) return 'Category must be a non-empty string';
  if (payload.paymentMethod !== undefined && !paymentMethods.includes(payload.paymentMethod)) return 'Payment method is invalid';
  if (payload.date !== undefined && Number.isNaN(new Date(payload.date).getTime())) return 'Date must be valid';
  if (payload.note !== undefined && typeof payload.note !== 'string') return 'Note must be a string';
  return null;
}

function validationResponse(error, res) {
  if (error.name === 'ValidationError') return res.status(400).json({ error: Object.values(error.errors).map((item) => item.message).join(', ') });
  return res.status(error.status || 500).json({ error: error.status ? error.message : 'Internal server error' });
}

app.get('/api/transactions/summary', async (req, res, next) => {
  try {
    const match = dateFilter(req.query.month);
    const [totals, categories] = await Promise.all([
      Transaction.aggregate([{ $match: match }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { ...match, type: 'expense' } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1, _id: 1 } }]),
    ]);
    const totalIncome = totals.find((item) => item._id === 'income')?.total || 0;
    const totalExpenses = totals.find((item) => item._id === 'expense')?.total || 0;
    return res.json({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses, categoryBreakdown: categories.map((item) => ({ category: item._id, total: item.total })) });
  } catch (error) { return next(error); }
});

app.get('/api/transactions', async (req, res, next) => {
  try { return res.json(await Transaction.find(dateFilter(req.query.month)).sort({ date: -1 })); } catch (error) { return next(error); }
});

app.post('/api/transactions', async (req, res, next) => {
  try {
    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ error });
    return res.status(201).json(await Transaction.create(req.body));
  } catch (error) { return validationResponse(error, res); }
});

app.put('/api/transactions/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid transaction id' });
    const protectedFields = ['_id', 'createdAt', 'updatedAt', '__v'];
    const payload = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => !protectedFields.includes(key)));
    const error = validatePayload(payload, true);
    if (error) return res.status(400).json({ error });
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, { $set: payload }, { returnDocument: 'after', runValidators: true });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    return res.json(transaction);
  } catch (error) { return validationResponse(error, res); }
});

app.delete('/api/transactions/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid transaction id' });
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    return res.json({ message: 'Transaction deleted successfully' });
  } catch (error) { return next(error); }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status) return res.status(error.status).json({ error: error.message });
  if (error.name === 'ValidationError') return res.status(400).json({ error: Object.values(error.errors).map((item) => item.message).join(', ') });
  console.error(error);
  return res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is required. Configure your MongoDB Atlas connection string in backend/.env');
  await mongoose.connect(mongoUri);
  const port = Number(process.env.PORT) || 5000;
  return app.listen(port, () => console.log(`Backend listening on port ${port}`));
}

if (require.main === module) startServer().catch((error) => { console.error('Unable to start server:', error.message); process.exit(1); });
module.exports = { app, startServer, Transaction };
