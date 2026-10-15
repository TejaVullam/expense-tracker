const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

export default function SummaryCards({ summary }) {
  return <section className="summary-grid">
    <article className="summary-card income"><span>Total Income</span><strong>{money(summary.totalIncome)}</strong></article>
    <article className="summary-card expense"><span>Total Expenses</span><strong>{money(summary.totalExpenses)}</strong></article>
    <article className="summary-card balance"><span>Balance</span><strong>{money(summary.balance)}</strong></article>
  </section>;
}
