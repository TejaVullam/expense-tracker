import { useEffect, useState } from 'react';

const empty = { amount: '', type: 'expense', category: '', date: new Date().toISOString().slice(0, 10), paymentMethod: 'UPI', note: '' };

export default function TransactionForm({ transaction, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(empty);
  useEffect(() => setForm(transaction ? { ...transaction, date: transaction.date.slice(0, 10) } : empty), [transaction]);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = (event) => {
    event.preventDefault();
    const { _id, createdAt, updatedAt, __v, ...editableFields } = form;
    onSubmit({ ...editableFields, amount: Number(form.amount) });
  };
  return <form className="transaction-form" onSubmit={submit}>
    <div className="form-header"><h2>{transaction ? 'Edit transaction' : 'Add transaction'}</h2><button type="button" className="icon-button" onClick={onCancel}>×</button></div>
    <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={change} /></label>
    <div className="form-row"><label>Type<select name="type" value={form.type} onChange={change}><option value="expense">Expense</option><option value="income">Income</option></select></label>
    <label>Date<input name="date" type="date" required value={form.date} onChange={change} /></label></div>
    <label>Category<input name="category" required value={form.category} onChange={change} placeholder="e.g. Food" /></label>
    <label>Payment method<select name="paymentMethod" value={form.paymentMethod} onChange={change}><option>UPI</option><option>Cash</option><option>Card</option><option>Bank Transfer</option></select></label>
    <label>Note <span className="muted">(optional)</span><textarea name="note" value={form.note} onChange={change} rows="3" /></label>
    <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button" disabled={saving}>{saving ? 'Saving...' : 'Save transaction'}</button></div>
  </form>;
}
