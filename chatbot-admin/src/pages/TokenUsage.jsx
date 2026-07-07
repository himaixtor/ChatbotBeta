import { Zap, TrendingUp, DollarSign, Database, MessageSquare, Search, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../utils/api';
import '../styles/token-usage.css';

export default function TokenUsage() {
  const [period, setPeriod] = useState('daily');
  const [hoveredCard, setHoveredCard] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['token-usage', period],
    queryFn: async () => {
      const { data } = await api.get('http://172.16.1.67:8010/api/v1/admin/usage/summary', {
        params: { period },
      });
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // Separate LLM from Embedding calls
  const llmData = data?.by_vendor_model?.filter((v) => v.call_type === 'llm') || [];
  const embeddingData = data?.by_vendor_model?.filter((v) => v.call_type === 'embedding') || [];

  // Calculate totals for each type
  const llmTokens = llmData.reduce((sum, v) => sum + (v.total_tokens || 0), 0);
  const llmCost = llmData.reduce((sum, v) => sum + (v.cost_usd || 0), 0);
  const embeddingTokens = embeddingData.reduce((sum, v) => sum + (v.total_tokens || 0), 0);
  const embeddingCost = embeddingData.reduce((sum, v) => sum + (v.cost_usd || 0), 0);

  if (error) {
    return (
      <div className="error-state">
        <h2>⚠️ Unable to Load Token Usage Data</h2>
        <p>{error.message}</p>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
          Please check if the API server at http://172.16.1.67:8010 is accessible.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        <h1 className="page-title">AI Token Usage & Costs</h1>
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

  const HelpTooltip = ({ text }) => (
    <div className="help-tooltip" title={text}>
      <Info size={14} />
    </div>
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">💡 Real-time Monitoring</p>
          <h1 className="page-title">AI Token Usage & Costs</h1>
          <p className="page-subtitle">Track your AI API consumption and costs in real-time</p>
        </div>
        <div className="period-selector">
          <button
            className={`period-btn ${period === 'daily' ? 'active' : ''}`}
            onClick={() => setPeriod('daily')}
          >
            Last 24 Hours
          </button>
          <button
            className={`period-btn ${period === 'weekly' ? 'active' : ''}`}
            onClick={() => setPeriod('weekly')}
          >
            Last 7 Days
          </button>
          <button
            className={`period-btn ${period === 'monthly' ? 'active' : ''}`}
            onClick={() => setPeriod('monthly')}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
          📊 Overall Summary
        </h2>
        <div className="card-grid">
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Database className="stat-icon" size={22} />
              <HelpTooltip text="Total number of tokens processed" />
            </div>
            <div className="value">{data?.total_tokens?.toLocaleString() ?? 0}</div>
            <div className="label">Total Tokens Used</div>
            <div className="subtext">Across all AI models</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <DollarSign className="stat-icon cost-icon" size={22} />
              <HelpTooltip text="Total cost in USD for this period" />
            </div>
            <div className="value">${data?.total_cost_usd?.toFixed(2) ?? '0.00'}</div>
            <div className="label">Total Cost</div>
            <div className="subtext">USD</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <TrendingUp className="stat-icon" size={22} />
              <HelpTooltip text="Number of different AI models used" />
            </div>
            <div className="value">{data?.by_vendor_model?.length ?? 0}</div>
            <div className="label">AI Models Used</div>
            <div className="subtext">From different vendors</div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Zap className="stat-icon" size={22} />
              <HelpTooltip text="Average cost per 1,000 tokens" />
            </div>
            <div className="value">
              ${((data?.total_cost_usd ?? 0) / ((data?.total_tokens ?? 1) / 1000)).toFixed(4)}
            </div>
            <div className="label">Cost per 1K Tokens</div>
            <div className="subtext">Average rate</div>
          </div>
        </div>
      </div>

      {/* LLM/Chat Section */}
      <div style={{ marginBottom: '2rem', borderTop: '2px solid #e5e5e5', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <MessageSquare size={24} style={{ color: '#2563eb' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>
            Conversation AI (LLM/Chat)
          </h2>
          <HelpTooltip text="GPT, Claude, and other large language models used for conversations" />
        </div>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          This is the cost for AI conversations (ChatGPT, Claude, etc.). Used when your chatbot responds to user queries.
        </p>

        {llmData.length > 0 ? (
          <>
            {/* LLM Stats */}
            <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card" style={{ backgroundColor: '#fef4f0', borderLeft: '4px solid #D17A44' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Database size={18} style={{ color: '#D17A44' }} />
                </div>
                <div className="value">{llmTokens.toLocaleString()}</div>
                <div className="label">Tokens Used</div>
                <div className="subtext">{((llmTokens / (data?.total_tokens || 1)) * 100).toFixed(1)}% of total</div>
              </div>

              <div className="stat-card" style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <DollarSign size={18} style={{ color: '#10b981' }} />
                </div>
                <div className="value">${llmCost.toFixed(2)}</div>
                <div className="label">Total Cost</div>
                <div className="subtext">{((llmCost / (data?.total_cost_usd || 1)) * 100).toFixed(1)}% of total</div>
              </div>

              <div className="stat-card" style={{ backgroundColor: '#f0f9f8', borderLeft: '4px solid #009688' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Zap size={18} style={{ color: '#009688' }} />
                </div>
                <div className="value">{llmData.length}</div>
                <div className="label">Models Used</div>
                <div className="subtext">For conversations</div>
              </div>
            </div>

            {/* LLM Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="chart-card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
                  Cost Distribution (LLM)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={llmData.map((v) => ({
                        name: `${v.model}`,
                        value: parseFloat(v.cost_usd) || 0,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {llmData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={['#10b981', '#059669', '#047857', '#065f46'][idx % 4]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(4)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
                  Input vs Output Tokens
                </h3>
                {(() => {
                  const totalPrompt = llmData.reduce((sum, v) => sum + (v.prompt_tokens || 0), 0);
                  const totalCompletion = llmData.reduce((sum, v) => sum + (v.completion_tokens || 0), 0);
                  const promptCompData = [
                    { name: 'Input Tokens (Prompt)', value: totalPrompt },
                    { name: 'Output Tokens (Completion)', value: totalCompletion },
                  ].filter((d) => d.value > 0);

                  return (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={promptCompData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          dataKey="value"
                        >
                          <Cell fill="#D17A44" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip formatter={(value) => value.toLocaleString()} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '0.5rem', color: '#999' }}>
            No conversation AI usage in this period
          </div>
        )}
      </div>

      {/* Embedding Section */}
      <div style={{ marginBottom: '2rem', borderTop: '2px solid #e5e5e5', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Search size={24} style={{ color: '#7c3aed' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>
            Search & Embeddings
          </h2>
          <HelpTooltip text="Vector embeddings used for semantic search and document understanding" />
        </div>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
          This is the cost for converting text into embeddings (vectors). Used for searching documents and understanding user queries.
        </p>

        {embeddingData.length > 0 ? (
          <>
            {/* Embedding Stats */}
            <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card" style={{ backgroundColor: '#fef4f0', borderLeft: '4px solid #D17A44' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Database size={18} style={{ color: '#D17A44' }} />
                </div>
                <div className="value">{embeddingTokens.toLocaleString()}</div>
                <div className="label">Tokens Used</div>
                <div className="subtext">{((embeddingTokens / (data?.total_tokens || 1)) * 100).toFixed(1)}% of total</div>
              </div>

              <div className="stat-card" style={{ backgroundColor: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <DollarSign size={18} style={{ color: '#10b981' }} />
                </div>
                <div className="value">${embeddingCost.toFixed(2)}</div>
                <div className="label">Total Cost</div>
                <div className="subtext">{((embeddingCost / (data?.total_cost_usd || 1)) * 100).toFixed(1)}% of total</div>
              </div>

              <div className="stat-card" style={{ backgroundColor: '#f0f9f8', borderLeft: '4px solid #009688' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Zap size={18} style={{ color: '#009688' }} />
                </div>
                <div className="value">{embeddingData.length}</div>
                <div className="label">Models Used</div>
                <div className="subtext">For embeddings</div>
              </div>
            </div>

            {/* Embedding Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="chart-card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
                  💰 Cost Distribution (Embeddings)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={embeddingData.map((v) => ({
                        name: `${v.model}`,
                        value: parseFloat(v.cost_usd) || 0,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {embeddingData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={['#10b981', '#059669', '#047857', '#065f46'][idx % 4]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(4)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
                  📊 Embedding Tokens
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={embeddingData.map((v) => ({
                        name: `${v.model}`,
                        value: v.total_tokens || 0,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {embeddingData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? '#D17A44' : '#10b981'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '0.5rem', color: '#999' }}>
            No embedding API usage in this period
          </div>
        )}
      </div>

      {/* Footer */}
      {data?.from && data?.to && (
        <div className="time-range">
          <small>
            📅 Period: {new Date(data.from).toLocaleString()} to {new Date(data.to).toLocaleString()}
          </small>
        </div>
      )}
    </>
  );
}
