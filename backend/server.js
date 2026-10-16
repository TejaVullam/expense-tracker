require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/transactions', transactionRoutes);
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
module.exports = { app, startServer };