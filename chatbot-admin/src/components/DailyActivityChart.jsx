import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * Combined line + stacked bar chart for last 30 days activity.
 */
export default function DailyActivityChart({ dailyStats = [] }) {
  const data = [...dailyStats].reverse().map((d) => ({
    date: d.date?.slice(5) || d.date,
    total: d.total,
    leads: d.leads,
    English: d.languages?.English || 0,
    Hindi: d.languages?.Hindi || 0,
    Gujarati: d.languages?.Gujarati || 0,
  }));

  if (!data.length) {
    return <p className="empty-state">No activity data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="English" stackId="lang" fill="#93c5fd" />
        <Bar dataKey="Hindi" stackId="lang" fill="#fcd34d" />
        <Bar dataKey="Gujarati" stackId="lang" fill="#86efac" />
        <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} name="Total chats" />
        <Line type="monotone" dataKey="leads" stroke="#16a34a" strokeWidth={2} name="Leads" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
