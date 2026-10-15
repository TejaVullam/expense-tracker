const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const { app } = require('../server');
const Transaction = require('../models/Transaction');

const uri = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/expense_tracker_test';
let server;
let income;
let expense;

test.before(async () => {
  await mongoose.connect(uri);
  await Transaction.deleteMany({});
  server = app.listen(0);
});

test.after(async () => {
  await Transaction.deleteMany({});
  await mongoose.disconnect();
  await new Promise((resolve) => server.close(resolve));
});

async function api(path, options) {
  const address = server.address();
  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
}

const body = (response) => response.json();

test('creates income and expense transactions', async () => {
  let response = await api('/api/transactions', { method: 'POST', body: JSON.stringify({ amount: 50000, type: 'income', category: 'Salary', date: '2026-10-05', paymentMethod: 'Bank Transfer' }) });
  assert.equal(response.status, 201);
  income = await body(response);
  response = await api('/api/transactions', { method: 'POST', body: JSON.stringify({ amount: 250, type: 'expense', category: 'Food', date: '2026-10-10', paymentMethod: 'UPI' }) });
  assert.equal(response.status, 201);
  expense = await body(response);
});

test('rejects invalid amounts and missing required fields', async () => {
  let response = await api('/api/transactions', { method: 'POST', body: JSON.stringify({ amount: -1, type: 'expense', category: 'Food', date: '2026-10-10', paymentMethod: 'UPI' }) });
  assert.equal(response.status, 400);
  response = await api('/api/transactions', { method: 'POST', body: JSON.stringify({ amount: 10, type: 'expense' }) });
  assert.equal(response.status, 400);
});

test('filters transactions by date month and excludes another month', async () => {
  const response = await api('/api/transactions?month=2026-10');
  const transactions = await body(response);
  assert.equal(response.status, 200);
  assert.equal(transactions.length, 2);
  assert.ok(transactions.every((item) => item.date.startsWith('2026-10')));
  const otherMonth = await api('/api/transactions?month=2026-09');
  assert.deepEqual(await body(otherMonth), []);
});

test('updates an existing transaction and returns 404 for missing transaction', async () => {
  let response = await api(`/api/transactions/${expense._id}`, { method: 'PUT', body: JSON.stringify({ amount: 300, category: 'Groceries' }) });
  assert.equal(response.status, 200);
  assert.equal((await body(response)).category, 'Groceries');
  response = await api('/api/transactions/000000000000000000000000', { method: 'PUT', body: JSON.stringify({ amount: 1 }) });
  assert.equal(response.status, 404);
});

test('calculates summary totals and handles empty monthly summary', async () => {
  const response = await api('/api/transactions/summary?month=2026-10');
  assert.deepEqual(await body(response), { totalIncome: 50000, totalExpenses: 300, balance: 49700, categoryBreakdown: [{ category: 'Groceries', total: 300 }] });
  const empty = await api('/api/transactions/summary?month=2026-11');
  assert.deepEqual(await body(empty), { totalIncome: 0, totalExpenses: 0, balance: 0, categoryBreakdown: [] });
});

test('deletes a transaction and returns 404 when it does not exist', async () => {
  let response = await api(`/api/transactions/${expense._id}`, { method: 'DELETE' });
  assert.equal(response.status, 200);
  response = await api(`/api/transactions/${expense._id}`, { method: 'DELETE' });
  assert.equal(response.status, 404);
});
