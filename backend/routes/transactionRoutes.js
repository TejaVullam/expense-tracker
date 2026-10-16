const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

const router = express.Router();
const fields = ['amount', 'type', 'category', 'date', 'paymentMethod', 'note'];
const types = ['income', 'expense'];
const paymentMethods = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

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

router.get('/summary', async (req, res, next) => {
  try {
    const match = dateFilter(req.query.month);
    const [totals, categories] = await Promise.all([
      Transaction.aggregate([{ $match: match }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { ...match, type: 'expense' } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1, _id: 1 } }]),
    ]);
    const totalIncome = totals.find((item) => item._id === 'income')?.total || 0;
    const totalExpenses = totals.find((item) => item._id === 'expense')?.total || 0;
    res.json({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses, categoryBreakdown: categories.map((item) => ({ category: item._id, total: item.total })) });
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try { res.json(await Transaction.find(dateFilter(req.query.month)).sort({ date: -1 })); } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const error = validatePayload(req.body);
    if (error) return res.status(400).json({ error });
    return res.status(201).json(await Transaction.create(req.body));
  } catch (error) { return validationResponse(error, res); }
});

router.put('/:id', async (req, res, next) => {
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

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid transaction id' });
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    return res.json({ message: 'Transaction deleted successfully' });
  } catch (error) { next(error); }
});

module.exports = router;