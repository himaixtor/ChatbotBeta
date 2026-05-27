/**
 * API client for chatbot widget backend calls.
 */

export function createApiClient(apiEndpoint) {
  const base = apiEndpoint.replace(/\/$/, '');

  async function request(path, options = {}) {
    const res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || 'Request failed');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    createSession: () => request('/api/session/create', { method: 'POST' }),
    validateSession: (sessionId) =>
      request(`/api/session/validate/${sessionId}`, { method: 'GET' }),
    sendMessage: (session_id, message) =>
      request('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({ session_id, message }),
      }),
    getHistory: (sessionId) =>
      request(`/api/chat/history/${sessionId}`, { method: 'GET' }),
  };
}
