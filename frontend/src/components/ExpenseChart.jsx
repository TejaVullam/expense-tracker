import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const colors = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#db2777'];
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

export default function ExpenseChart({ data }) {
  if (!data.length) return <div className="chart-empty">No expense categories for this month.</div>;
  return <div className="chart-wrap"><ResponsiveContainer width="100%" height={260}>
    <PieChart><Pie data={data} dataKey="total" nameKey="category" innerRadius={65} outerRadius={95} paddingAngle={3}>
      {data.map((entry, index) => <Cell key={entry.category} fill={colors[index % colors.length]} />)}
    </Pie><Tooltip formatter={(value) => money(value)} /></PieChart>
  </ResponsiveContainer>
  <div className="legend">{data.map((item, index) => <span key={item.category}><i style={{ background: colors[index % colors.length] }} />{item.category}</span>)}</div></div>;
}
