import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const currentMonth = () => new Date().toISOString().slice(0, 7);
const blankSummary = { totalIncome: 0, totalExpenses: 0, balance: 0, categoryBreakdown: [] };
const colors = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#db2777'];
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);
const emptyTransaction = {
  amount: '',
  type: 'expense',
  category: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'UPI',
  note: '',
};

async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function SummaryCards({ summary }) {
  return <section className="summary-grid">
    <article className="summary-card income"><span>Total Income</span><strong>{money(summary.totalIncome)}</strong></article>
    <article className="summary-card expense"><span>Total Expenses</span><strong>{money(summary.totalExpenses)}</strong></article>
    <article className="summary-card balance"><span>Balance</span><strong>{money(summary.balance)}</strong></article>
  </section>;
}

function ExpenseChart({ data }) {
  if (!data.length) return <div className="chart-empty">No expense categories for this month.</div>;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height={260}>
    <PieChart><Pie data={data} dataKey="total" nameKey="category" innerRadius={65} outerRadius={95} paddingAngle={3}>
      {data.map((entry, index) => <Cell key={entry.category} fill={colors[index % colors.length]} />)}
    </Pie><Tooltip formatter={(value) => money(value)} /></PieChart>
  </ResponsiveContainer>
  <div className="legend">{data.map((item, index) => <span key={item.category}><i style={{ background: colors[index % colors.length] }} />{item.category}</span>)}</div></div>;
}

function TransactionForm({ transaction, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState(emptyTransaction);
  useEffect(() => setForm(transaction ? { ...transaction, date: transaction.date.slice(0, 10) } : emptyTransaction), [transaction]);
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

function TransactionList({ transactions, hasFilters, onEdit, onDelete }) {
  if (!transactions.length) return <div className="empty-state"><h3>{hasFilters ? 'No matching transactions' : 'No transactions yet'}</h3><p>{hasFilters ? 'Try adjusting or clearing your filters.' : 'Add your first transaction to see it here.'}</p></div>;
  return <div className="transaction-list">{transactions.map((item) => <article className="transaction-item" key={item._id}>
    <div className="transaction-main"><span className={`transaction-dot ${item.type}`} /><div><strong>{item.category}</strong><small>{new Date(item.date).toLocaleDateString('en-IN')} · {item.paymentMethod}{item.note ? ` · ${item.note}` : ''}</small></div></div>
    <strong className={item.type}>{item.type === 'income' ? '+' : '-'}{money(item.amount)}</strong>
    <div className="item-actions"><button onClick={() => onEdit(item)}>Edit</button><button className="danger-text" onClick={() => onDelete(item._id)}>Delete</button></div>
  </article>)}</div>;
}

export default function App() {
  const [month, setMonth] = useState(currentMonth());
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(blankSummary);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const query = `?month=${month}`;
      const [list, totals] = await Promise.all([request(`${API}/transactions${query}`), request(`${API}/transactions/summary${query}`)]);
      setTransactions(list); setSummary(totals);
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [month]);
  const categories = useMemo(() => [...new Set(transactions.map((item) => item.category))].sort(), [transactions]);
  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transactions.filter((item) => {
      const matchesSearch = !term || [item.category, item.note, item.paymentMethod, item.type, item.date, String(item.amount)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesSearch
        && (!typeFilter || item.type === typeFilter)
        && (!categoryFilter || item.category === categoryFilter)
        && (!paymentMethodFilter || item.paymentMethod === paymentMethodFilter);
    });
  }, [transactions, search, typeFilter, categoryFilter, paymentMethodFilter]);
  const filtersActive = Boolean(search || typeFilter || categoryFilter || paymentMethodFilter);
  const clearFilters = () => { setSearch(''); setTypeFilter(''); setCategoryFilter(''); setPaymentMethodFilter(''); };
  const save = async (data) => {
    setSaving(true); setError('');
    try {
      await request(editing ? `${API}/transactions/${editing._id}` : `${API}/transactions`, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      setFormOpen(false); setEditing(null); await load();
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try { await request(`${API}/transactions/${id}`, { method: 'DELETE' }); await load(); } catch (deleteError) { setError(deleteError.message); }
  };
  return <main className="app-shell">
    <header className="topbar"><div><p className="eyebrow">Personal finance</p><h1>Expense Tracker</h1></div><button className="button" onClick={() => { setEditing(null); setFormOpen(true); }}>+ Add transaction</button></header>
    {error && <div className="error-banner">{error}</div>}
    <div className="toolbar"><label>Viewing month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></div>
    {loading ? <div className="loading">Loading your transactions...</div> : <><SummaryCards summary={summary} /><section className="content-grid"><div className="panel"><div className="panel-heading"><h2>Expenses by category</h2><span>{month}</span></div><ExpenseChart data={summary.categoryBreakdown} /></div><div className="panel"><div className="panel-heading"><h2>Transactions</h2><span>{filteredTransactions.length}{filtersActive ? ` of ${transactions.length}` : ''} total</span></div><div className="filter-controls">
      <input aria-label="Search transactions" type="search" placeholder="Search transactions..." value={search} onChange={(event) => setSearch(event.target.value)} />
      <select aria-label="Filter by type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
      <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
      <select aria-label="Filter by payment method" value={paymentMethodFilter} onChange={(event) => setPaymentMethodFilter(event.target.value)}><option value="">All payment methods</option><option>UPI</option><option>Cash</option><option>Card</option><option>Bank Transfer</option></select>
      {filtersActive && <button type="button" className="clear-filters" onClick={clearFilters}>Clear filters</button>}
    </div><TransactionList transactions={filteredTransactions} hasFilters={filtersActive} onEdit={(item) => { setEditing(item); setFormOpen(true); }} onDelete={remove} /></div></section></>}
    {formOpen && <div className="modal-backdrop"><div className="modal"><TransactionForm transaction={editing} onSubmit={save} onCancel={() => { setFormOpen(false); setEditing(null); }} saving={saving} /></div></div>}
  </main>;
}
