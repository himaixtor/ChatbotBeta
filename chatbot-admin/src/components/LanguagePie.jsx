import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#009688', '#D17A44', '#006F6D', '#6D6E70', '#80cbc4'];

export default function LanguagePie({ data = {} }) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  if (!chartData.length) {
    return <p style={{ color: 'var(--muted)', fontSize: '0.460rem' }}>No data</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart margin={{ bottom: 20 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="45%"
          cy="45%"
          outerRadius={45}
          label={false}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend
          verticalAlign="bottom"
          height={25}
          wrapperStyle={{ paddingTop: '10px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
