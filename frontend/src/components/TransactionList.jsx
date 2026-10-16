const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
export default function TransactionList({ transactions, hasFilters, onEdit, onDelete }) {
  if (!transactions.length) return <div className="empty-state"><h3>{hasFilters ? 'No matching transactions' : 'No transactions yet'}</h3><p>{hasFilters ? 'Try adjusting or clearing your filters.' : 'Add your first transaction to see it here.'}</p></div>;
  return <div className="transaction-list">{transactions.map((item) => <article className="transaction-item" key={item._id}>
    <div className="transaction-main"><span className={`transaction-dot ${item.type}`} /><div><strong>{item.category}</strong><small>{new Date(item.date).toLocaleDateString('en-IN')} · {item.paymentMethod}{item.note ? ` · ${item.note}` : ''}</small></div></div>
    <strong className={item.type}>{item.type === 'income' ? '+' : '-'}{money(item.amount)}</strong>
    <div className="item-actions"><button onClick={() => onEdit(item)}>Edit</button><button className="danger-text" onClick={() => onDelete(item._id)}>Delete</button></div>
  </article>)}</div>;
}
