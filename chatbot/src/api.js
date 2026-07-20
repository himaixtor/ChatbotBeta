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
    // Generic methods for custom endpoints
    post: (path, body) =>
      request(path, { method: 'POST', body: JSON.stringify(body) }),
    get: (path) => request(path, { method: 'GET' }),

    // Chat endpoints
    createSession: () => request('/api/session/create', { method: 'POST' }),
    validateSession: (sessionId) =>
      request(`/api/session/validate/${sessionId}`, { method: 'GET' }),
    sendMessage: (session_id, message) =>
      request('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({ session_id, message }),
      }),
    uploadFile: async (session_id, file) => {
      const formData = new FormData();
      formData.append('session_id', session_id);
      formData.append('file', file);

      const res = await fetch(`${base}/api/chat/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || res.statusText || 'Upload failed');
        err.status = res.status;
        throw err;
      }
      return data;
    },
    getAttachmentUrl: (sessionId, messageId) =>
      `${base}/api/chat/history/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(messageId)}/file`,
    getHistory: (sessionId) =>
      request(`/api/chat/history/${sessionId}`, { method: 'GET' }),
    submitFeedback: (sessionId, rating) =>
      request('/api/session/feedback', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, rating }),
      }),
  };
}
