import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#f59e0b', '#facc15', '#fb923c', '#15803d', '#7c6a55'];

export default function LanguagePie({ data = {} }) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  if (!chartData.length) {
    return <p style={{ color: '#7c6a55', fontSize: '0.875rem' }}>No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
