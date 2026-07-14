import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function HourlyActivityChart({ distribution = [], peakHour }) {
  // Format hour to 12-hour format
  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Prepare data for chart - ensure all 24 hours are included
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  const dataMap = new Map(distribution.map(item => [item.hour, item]));

  const data = allHours.map((hour) => {
    const item = dataMap.get(hour);
    return {
      hour: hour,
      hourLabel: formatHour(hour),
      count: item?.count || 0,
      percentage: item ? parseFloat(item.percentage) : 0,
    };
  });

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6D6E70' }}>
        No hourly data available yet
      </div>
    );
  }

  const peakData = data.find(d => d.hour === peakHour);

  return (
    <>
      {/* Chart */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#212529' }}>
          💬 Chat Activity by Hour
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={data}
            margin={{ top: 15, right: 20, left: 40, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="hourLabel"
              tick={{ fontSize: 12, fill: '#6D6E70' }}
              tickInterval={2}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              label={{ value: 'Number of Chats', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12, fill: '#6D6E70' } }}
              tick={{ fontSize: 12, fill: '#6D6E70' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
              formatter={(value) => [value, 'Chats']}
              labelFormatter={(label) => `Time: ${label}`}
              cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
            />
            {/* <Legend wrapperStyle={{ paddingTop: '1.5rem', fontSize: '14px' }} /> */}
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 7, fill: '#1e40af' }}
              name="Chats per Hour"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
