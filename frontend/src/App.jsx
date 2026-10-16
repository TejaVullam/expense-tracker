import { useEffect, useMemo, useState } from 'react';
import SummaryCards from './components/SummaryCards';
import ExpenseChart from './components/ExpenseChart';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const currentMonth = () => new Date().toISOString().slice(0, 7);
const blankSummary = { totalIncome: 0, totalExpenses: 0, balance: 0, categoryBreakdown: [] };

async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
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
