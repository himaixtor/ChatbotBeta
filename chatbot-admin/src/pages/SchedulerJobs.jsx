import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Play, RefreshCw, Save, Clock, AlertCircle } from 'lucide-react';
import api from '../utils/api';

function getErrorMessage(error) {
  return error?.response?.data?.error || 'Something went wrong';
}

function statusBadge(status) {
  if (!status) return <span className="badge badge-no">—</span>;
  const s = String(status).toLowerCase();
  if (s === 'running') return <span className="badge badge-yes">Running</span>;
  if (s === 'completed') return <span className="badge badge-yes">Completed</span>;
  if (s === 'error') return <span className="badge badge-no">Error</span>;
  return <span className="badge badge-no">{status}</span>;
}

export default function SchedulerJobs() {
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState({
    id: '',
    job_name: '',
    details: '',
    run_timing: '',
    cron_expression: '*/5 * * * * *',
    is_active: true,
  });

  const [error, setError] = useState('');

  const jobsQuery = useQuery({
    queryKey: ['scheduler-jobs'],
    queryFn: async () => {
      const { data } = await api.get('/api/scheduler/jobs');
      return data?.data || [];
    },
  });

  const executionsQuery = useQuery({
    queryKey: ['scheduler-executions', draft.id || ''],
    queryFn: async () => {
      if (!draft.id) return [];
      const { data } = await api.get(`/api/scheduler/executions?jobId=${draft.id}`);
      return data?.data || [];
    },
    enabled: !!draft.id,
  });

  const activeJob = useMemo(() => {
    if (!draft.id) return null;
    return jobsQuery.data?.find((j) => j.id === draft.id) || null;
  }, [draft.id, jobsQuery.data]);

  const latestStatus = useMemo(() => {
    const list = executionsQuery.data || [];
    return list.length ? list[0].status : null;
  }, [executionsQuery.data]);

  const createOrUpdate = useMutation({
    mutationFn: async () => {
      const payload = {
        job_name: draft.job_name,
        details: draft.details || null,
        run_timing: draft.run_timing || null,
        cron_expression: draft.cron_expression,
        is_active: draft.is_active,
        created_by: 'admin',
        updated_by: 'admin',
      };

      if (draft.id) {
        const { data } = await api.put(`/api/scheduler/jobs/${draft.id}`, {
          ...payload,
          updated_by: 'admin',
        });
        return data?.data;
      }

      const { data } = await api.post('/api/scheduler/jobs', payload);
      return data?.data;
    },
    onSuccess: () => {
      setError('');
      setDraft({
        id: '',
        job_name: '',
        details: '',
        run_timing: '',
        cron_expression: '*/5 * * * * *',
        is_active: true,
      });
      queryClient.invalidateQueries({ queryKey: ['scheduler-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['scheduler-executions'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const runNow = useMutation({
    mutationFn: async (jobId) => {
      const { data } = await api.post(`/api/scheduler/jobs/${jobId}/run-now`);
      return data?.data;
    },
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['scheduler-executions'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const startEdit = (job) => {
    setError('');
    setDraft({
      id: job.id,
      job_name: job.job_name || '',
      details: job.details || '',
      run_timing: job.run_timing || '',
      cron_expression: job.cron_expression || '',
      is_active: !!job.is_active,
    });
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Automation</p>
          <h1 className="page-title">Scheduler Jobs</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} />
            {statusBadge(latestStatus)}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: 'auto' }}
            onClick={() => runNow.mutate(draft.id)}
            disabled={!draft.id || runNow.isPending}
            title={!draft.id ? 'Select a job first (Edit/Add panel) to enable Run now' : 'Run now'}
          >
            <Play size={18} />
            {runNow.isPending ? 'Triggering...' : 'Run now'}
          </button>
        </div>
      </div>

      <div className="management-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Jobs</h2>
            <button
              type="button"
              className="btn-icon"
              title="Reset editor"
              onClick={() =>
                setDraft({
                  id: '',
                  job_name: '',
                  details: '',
                  run_timing: '',
                  cron_expression: '*/5 * * * * *',
                  is_active: true,
                })
              }
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {jobsQuery.isLoading && <div className="empty-state">Loading...</div>}

          {!jobsQuery.isLoading && jobsQuery.data?.length === 0 && (
            <div className="empty-state">No jobs found</div>
          )}

          {!jobsQuery.isLoading && jobsQuery.data?.length > 0 && (
            <div className="table-wrap flat-table" style={{ maxHeight: 420 }}>
              <table>
                <thead>
                  <tr>
                    <th>Job name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsQuery.data.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontWeight: 900 }}>{job.job_name}</div>
                          <div style={{ opacity: 0.75 }}>
                            <code>{job.id.slice(0, 8)}</code>
                          </div>
                        </div>
                      </td>
                      <td>
                        {job.is_active ? (
                          <span className="badge badge-yes">Active</span>
                        ) : (
                          <span className="badge badge-no">Inactive</span>
                        )}
                      </td>
                      <td>
                        <button type="button" className="btn-icon" title="Edit" onClick={() => startEdit(job)}>
                          <Edit3 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>{draft.id ? 'Edit job' : 'Create job'}</h2>
          </div>

          {error && (
            <div className="error-text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createOrUpdate.mutate();
            }}
            className="form-grid"
          >
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Job name</label>
              <input value={draft.job_name} onChange={(e) => setDraft((d) => ({ ...d, job_name: e.target.value }))} required />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Details</label>
              <input value={draft.details} onChange={(e) => setDraft((d) => ({ ...d, details: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Run timing (label)</label>
              <input value={draft.run_timing} onChange={(e) => setDraft((d) => ({ ...d, run_timing: e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Cron expression</label>
              <input value={draft.cron_expression} onChange={(e) => setDraft((d) => ({ ...d, cron_expression: e.target.value }))} required />
            </div>

            <label className="check-row" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
              <input type="checkbox" checked={draft.is_active} onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))} />
              Active job
            </label>

            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary action-btn" disabled={createOrUpdate.isPending}>
                {draft.id ? <Save size={18} /> : <Save size={18} />}
                {createOrUpdate.isPending ? 'Saving...' : draft.id ? 'Save changes' : 'Create'}
              </button>
              {draft.id && (
                <div style={{ marginTop: 10, opacity: 0.8 }}>
                  Current job id: <code>{draft.id}</code>
                </div>
              )}
            </div>
          </form>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 0 }}>
        <div className="panel-header">
          <h2>Job history</h2>
          {activeJob?.job_name && <div style={{ opacity: 0.8, fontWeight: 800 }}>{activeJob.job_name}</div>}
        </div>

        {!draft.id && <div className="empty-state">Select a job to view its history</div>}

        {draft.id && (
          <div className="table-wrap flat-table" style={{ maxHeight: 450 }}>
            <table>
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Processed</th>
                  <th>Deleted</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {executionsQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      Loading...
                    </td>
                  </tr>
                )}

                {!executionsQuery.isLoading && (executionsQuery.data || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state">
                      No history yet
                    </td>
                  </tr>
                )}

                {!executionsQuery.isLoading &&
                  (executionsQuery.data || []).map((h) => (
                    <tr key={h.id}>
                      <td>{h.start_time ? new Date(h.start_time).toLocaleString() : '—'}</td>
                      <td>{h.end_time ? new Date(h.end_time).toLocaleString() : '—'}</td>
                      <td>{statusBadge(h.status)}</td>
                      <td>{h.records_processed ?? 0}</td>
                      <td>{h.records_deleted ?? 0}</td>
                      <td style={{ maxWidth: 340 }}>
                        {h.error_message ? h.error_message : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

