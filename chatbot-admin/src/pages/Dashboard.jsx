import { Activity, Languages, MessageCircle, UserRoundCheck, FileText, Link as LinkIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import LanguagePie from '../components/LanguagePie';
import DailyActivityChart from '../components/DailyActivityChart';
import TokenUsageSummary from '../components/TokenUsageSummary';

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data: stats } = await api.get('/api/admin/stats');
      return stats;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const leadPct =
    data?.total_chats > 0
      ? ((data.leads_generated / data.total_chats) * 100).toFixed(1)
      : '0';

  if (isLoading) {
    return (
      <>
        <h1 className="page-title">Dashboard</h1>
        <div className="card-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 40, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 16, width: '60%' }} />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Enterprise insights</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
      </div>
      <div className="card-grid">
        <div className="stat-card">
          <MessageCircle className="stat-icon" size={22} />
          <div className="value">{data?.total_chats ?? 0}</div>
          <div className="label">Total conversations</div>
        </div>
        <div className="stat-card">
          <UserRoundCheck className="stat-icon" size={22} />
          <div className="value">{data?.leads_generated ?? 0}</div>
          <div className="label">Leads captured ({leadPct}%)</div>
        </div>
        <div className="stat-card">
          <FileText className="stat-icon" size={22} />
          <div className="value">{data?.total_documents ?? 0}</div>
          <div className="label">Ingested documents</div>
        </div>
        <div className="stat-card">
          <LinkIcon className="stat-icon" size={22} />
          <div className="value">{data?.total_urls ?? 0}</div>
          <div className="label">Ingested URLs</div>
        </div>
        <div className="stat-card">
          <Languages className="stat-icon" size={22} />
          <div className="label" style={{ marginBottom: 8 }}>
            Language breakdown (chats)
          </div>
          <LanguagePie data={data?.language_breakdown} />
        </div>
        <div className="stat-card">
          <Languages className="stat-icon" size={22} />
          <div className="label" style={{ marginBottom: 8 }}>
            Users by language (unique emails)
          </div>
          <LanguagePie data={data?.users_by_language} />
        </div>
      </div>
      <div className="chart-card">
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>
          <Activity size={18} /> Daily activity (last 30 days)
        </h2>
        <DailyActivityChart dailyStats={data?.daily_stats} />
      </div>

      {isAdmin && <TokenUsageSummary />}
    </>
  );
}
