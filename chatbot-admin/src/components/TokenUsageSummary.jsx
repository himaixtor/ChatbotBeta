import { Gauge, TrendingUp, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function TokenUsageSummary() {
  const { data, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="chart-card">
        <div style={{ height: 120 }} className="skeleton" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="chart-card token-usage-widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 0, marginBottom: 1.5 }}>
        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
          <Gauge size={18} style={{ marginRight: 8 }} /> Token Usage (Daily)
        </h2>
        <Link
          to="/token-usage"
          style={{
            fontSize: '0.85rem',
            color: '#2563eb',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          View Details →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginBottom: 1.5 }}>
        <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 500, marginBottom: '0.5rem' }}>
            TOTAL TOKENS
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb' }}>
            {data?.total_tokens?.toLocaleString() ?? 0}
          </div>
        </div>

        <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 500, marginBottom: '0.5rem' }}>
            COST (USD)
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669' }}>
            ${data?.total_cost_usd?.toFixed(2) ?? '0.00'}
          </div>
        </div>

        <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 500, marginBottom: '0.5rem' }}>
            VENDORS USED
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7c3aed' }}>
            {data?.by_vendor_model?.length ?? 0}
          </div>
        </div>
      </div>

      {data?.by_vendor_model && data.by_vendor_model.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0.5rem 0', color: '#1f2937' }}>
            Top Vendors:
          </h3>
          {data.by_vendor_model.slice(0, 3).map((vendor, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: '#f9fafb',
                borderRadius: '0.375rem',
                borderLeft: '3px solid #2563eb',
              }}
            >
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
                  {vendor.model}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#999' }}>
                  {vendor.total_tokens.toLocaleString()} tokens
                </div>
              </div>
              <div style={{ fontWeight: 600, color: '#059669' }}>
                ${vendor.cost_usd.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
