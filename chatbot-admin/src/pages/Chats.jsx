import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye, Download, Copy, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../hooks/useAuth';
import Pagination from '../components/Pagination';
import ViewChatModal from '../components/ViewChatModal';
import LoadingSkeleton from '../components/LoadingSkeleton';

const LANG_COLORS = {
  English: '#dbeafe',
  Hindi: '#fef3c7',
  Gujarati: '#dcfce7',
};

function canDownload(role) {
  return role === 'admin' || role === 'manager';
}

function canDelete(role) {
  return role === 'admin';
}

export default function Chats() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewSession, setViewSession] = useState(null);

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const search = searchParams.get('search') || '';
  const language = searchParams.get('language') || 'All';
  const lead_status = searchParams.get('lead_status') || 'all';
  const date_from = searchParams.get('date_from') || '';
  const date_to = searchParams.get('date_to') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (language !== 'All') p.set('language', language);
    if (lead_status !== 'all') p.set('lead_status', lead_status);
    if (date_from) p.set('date_from', date_from);
    if (date_to) p.set('date_to', date_to);
    p.set('sortBy', sortBy);
    p.set('sortOrder', sortOrder);
    return p.toString();
  }, [page, limit, debouncedSearch, language, lead_status, date_from, date_to, sortBy, sortOrder]);

  // Sync debounced search to URL
  useEffect(() => {
    const current = searchParams.get('search') || '';
    if (debouncedSearch === current) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set('search', debouncedSearch);
    else next.delete('search');
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-chats', queryString],
    queryFn: async () => {
      const { data: res } = await api.get(`/api/admin/chats?${queryString}`);
      return res;
    },
  });

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next);
  };

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
  };

  const downloadSession = async (sessionId) => {
    const res = await api.get(`/api/admin/export/session/${sessionId}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${sessionId.slice(0, 8)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const res = await api.get(`/api/admin/export/all?${queryString}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatbot-all-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this session?')) return;
    await api.delete(`/api/admin/chats/${sessionId}`);
    refetch();
  };

  const rows = data?.data || [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Chat History
        </h1>
        {canDownload(user?.role) && (
          <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={downloadAll}>
            Download All
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search name, email, session…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ minWidth: 220 }}
        />
        <select
          value={language}
          onChange={(e) => updateParams({ language: e.target.value, page: 1 })}
        >
          <option value="All">All languages</option>
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
          <option value="Gujarati">Gujarati</option>
        </select>
        <select
          value={lead_status}
          onChange={(e) => updateParams({ lead_status: e.target.value, page: 1 })}
        >
          <option value="all">All leads</option>
          <option value="generated">Generated</option>
          <option value="not_generated">Not Generated</option>
        </select>
        <input
          type="date"
          value={date_from}
          onChange={(e) => updateParams({ date_from: e.target.value, page: 1 })}
        />
        <input
          type="date"
          value={date_to}
          onChange={(e) => updateParams({ date_to: e.target.value, page: 1 })}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Session ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Language</th>
              <th>Interested In</th>
              <th>Lead</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <LoadingSkeleton />}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-state">
                  No chat sessions found
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((row) => (
                <tr key={row.session_id}>
                  <td>
                    <code>{row.session_id.slice(0, 8)}</code>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => copyId(row.session_id)}
                      title="Copy full ID"
                    >
                      <Copy size={14} />
                    </button>
                  </td>
                  <td>{row.name || '—'}</td>
                  <td>{row.email || '—'}</td>
                  <td>
                    {row.chat_language ? (
                      <span
                        className="badge badge-lang"
                        style={{
                          background: LANG_COLORS[row.chat_language] || '#f1f5f9',
                        }}
                      >
                        {row.chat_language}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{row.interested_in || '—'}</td>
                  <td>
                    <span className={`badge ${row.lead_generated ? 'badge-yes' : 'badge-no'}`}>
                      {row.lead_generated ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{format(new Date(row.created_at), 'dd MMM yyyy, HH:mm')}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-icon"
                      title="View"
                      onClick={() => setViewSession(row.session_id)}
                    >
                      <Eye size={18} />
                    </button>
                    {canDownload(user?.role) && (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Download CSV"
                        onClick={() => downloadSession(row.session_id)}
                      >
                        <Download size={18} />
                      </button>
                    )}
                    {canDelete(user?.role) && (
                      <button
                        type="button"
                        className="btn-icon"
                        title="Delete"
                        onClick={() => handleDelete(row.session_id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={data?.total ?? 0}
        onPageChange={(p) => updateParams({ page: p })}
        onLimitChange={(l) => updateParams({ limit: l, page: 1 })}
      />

      {viewSession && (
        <ViewChatModal sessionId={viewSession} onClose={() => setViewSession(null)} />
      )}
    </>
  );
}
