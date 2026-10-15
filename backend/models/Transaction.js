const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: [Number.MIN_VALUE, 'Amount must be greater than zero'] },
  type: { type: String, required: true, enum: ['income', 'expense'] },
  category: { type: String, required: true, trim: true, minlength: [1, 'Category is required'] },
  date: { type: Date, required: true },
  paymentMethod: { type: String, required: true, enum: ['UPI', 'Cash', 'Card', 'Bank Transfer'] },
  note: { type: String, trim: true },
}, { timestamps: true, collection: 'transactions' });

transactionSchema.path('amount').validate(Number.isFinite, 'Amount must be a finite number');
module.exports = mongoose.model('Transaction', transactionSchema);