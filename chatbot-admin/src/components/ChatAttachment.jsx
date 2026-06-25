import { useEffect, useState } from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import api from '../utils/api';

function isImageMime(mimeType) {
  return mimeType?.startsWith('image/');
}

export default function ChatAttachment({ sessionId, messageId, fileName, mimeType }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const fetchAttachment = async () => {
    const { data } = await api.get(
      `/api/admin/chats/${sessionId}/messages/${messageId}/file`,
      { responseType: 'blob' }
    );
    const url = URL.createObjectURL(data);
    return url;
  };

  const openViewer = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const url = await fetchAttachment();
      setBlobUrl(url);
      setViewerOpen(true);
    } catch {
      setError('Could not load attachment.');
    } finally {
      setLoading(false);
    }
  };

  const openInNewTab = async () => {
    setError('');
    setLoading(true);
    try {
      const url = blobUrl || (await fetchAttachment());
      window.open(url, '_blank', 'noopener,noreferrer');
      if (!blobUrl) {
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch {
      setError('Could not open attachment.');
    } finally {
      setLoading(false);
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
  };

  const label = fileName || 'Attachment';
  const isImage = isImageMime(mimeType);

  return (
    <>
      <button
        type="button"
        className="chat-attachment-card"
        onClick={openViewer}
        disabled={loading}
        title={`View ${label}`}
      >
        <span className="chat-attachment-icon" aria-hidden="true">
          {isImage ? '🖼️' : <FileText size={18} />}
        </span>
        <span className="chat-attachment-meta">
          <span className="chat-attachment-name">{label}</span>
          <span className="chat-attachment-type">
            {isImage ? 'Image' : 'PDF'} · Click to view
          </span>
        </span>
      </button>
      {error && <span className="chat-attachment-error">{error}</span>}

      {viewerOpen && blobUrl && (
        <div className="attachment-viewer-overlay" onClick={closeViewer} role="presentation">
          <div
            className="attachment-viewer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={`View ${label}`}
          >
            <div className="attachment-viewer-header">
              <strong>{label}</strong>
              <div className="attachment-viewer-actions">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={openInNewTab}
                  title="Open in new tab"
                >
                  <ExternalLink size={18} />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={closeViewer}
                  aria-label="Close viewer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="attachment-viewer-body">
              {isImage ? (
                <img src={blobUrl} alt={label} className="attachment-viewer-image" />
              ) : (
                <iframe
                  src={blobUrl}
                  title={label}
                  className="attachment-viewer-pdf"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
