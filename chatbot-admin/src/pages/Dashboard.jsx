import { Activity, Languages, MessageCircle, UserRoundCheck, FileText, Link as LinkIcon, DollarSign, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import LanguagePie from '../components/LanguagePie';
import DailyActivityChart from '../components/DailyActivityChart';
import ActiveChats24h from '../components/ActiveChats24h';
import HourlyActivityChart from '../components/HourlyActivityChart';

export default function Dashboard() {
  const { user } = useAuth();
  const canSeeTokenUsage = !!user?.permissions?.can_access_token_usage;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data: stats } = await api.get('/api/admin/stats');
      return stats;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: tokenData } = useQuery({
    queryKey: ['token-usage-summary'],
    queryFn: async () => {
      try {
        const { data } = await api.get('http://172.16.1.67:8010/api/v1/admin/usage/summary', {
          params: { period: 'daily' },
        });
        return data;
      } catch (error) {
        console.error('Failed to fetch token usage:', error);
        return null;
      }
    },
    refetchInterval: 10 * 60 * 1000,
  });

  // Calculate LLM and Embedding costs
  const llmData = tokenData?.by_vendor_model?.filter((v) => v.call_type === 'llm') || [];
  const embeddingData = tokenData?.by_vendor_model?.filter((v) => v.call_type === 'embedding') || [];
  const llmCost = llmData.reduce((sum, v) => sum + (v.cost_usd || 0), 0);
  const embeddingCost = embeddingData.reduce((sum, v) => sum + (v.cost_usd || 0), 0);
  const totalTokenCost = llmCost + embeddingCost;

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
        <ActiveChats24h count={data?.dashboard_cards?.active_chats_24h?.count} />
        <div className="stat-card">
          <DollarSign className="stat-icon" size={22} />
          <div className="value">${totalTokenCost.toFixed(2)}</div>
          <div className="label">Token Usage Cost (Daily)</div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>LLM + Embedding</div>
        </div>
        <div className="stat-card">
          <Languages className="stat-icon" size={22} />
          <div className="label" style={{ marginBottom: 8 }}>
            Language breakdown (chats)
          </div>
          <LanguagePie data={data?.language_breakdown} />
        </div>
        <div className="stat-card">
          <Star className="stat-icon" size={22} />
          <div className="value">{data?.review_statistics?.avg_rating ?? '0.0'}</div>
          <div className="label">Average Rating ({data?.review_statistics?.total_reviews ?? 0} reviews)</div>
        </div>
      </div>
      <div className="chart-card">
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>
          <Activity size={18} /> Daily activity (last 30 days)
        </h2>
        <DailyActivityChart dailyStats={data?.daily_stats} />
      </div>

      <div className="chart-card">
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>
          <Activity size={18} /> Hourly patterns (last 30 days)
        </h2>
        <HourlyActivityChart
          distribution={data?.dashboard_cards?.avg_chat_time?.distribution}
          peakHour={data?.dashboard_cards?.avg_chat_time?.peak_hour}
        />
      </div>

      {data?.recent_reviews && data.recent_reviews.length > 0 && (
        <div className="chart-card">
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>
            <Star size={18} /> Recent Feedback
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '10px', textAlign: 'center', fontWeight: 600 }}>Rating</th>
                  <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_reviews.map((review) => (
                  <tr key={review.session_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px' }}>{review.name || '—'}</td>
                    <td style={{ padding: '10px', fontSize: '12px' }}>{review.email || '—'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: review.rating >= 4 ? '#dcfce7' : review.rating >= 3 ? '#fef3c7' : '#fee2e2',
                        color: review.rating >= 4 ? '#166534' : review.rating >= 3 ? '#92400e' : '#991b1b',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}>
                        {'⭐'.repeat(review.rating)} {review.rating}/5
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontSize: '12px' }}>
                      {format(new Date(review.created_at), 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
