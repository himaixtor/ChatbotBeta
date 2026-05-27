import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import api from '../utils/api';

export default function ViewChatModal({ sessionId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['session-messages', sessionId],
    queryFn: async () => {
      const { data: res } = await api.get(`/api/admin/chats/${sessionId}/messages`);
      return res.messages;
    },
    enabled: !!sessionId,
  });

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <strong>Session {sessionId?.slice(0, 8)}…</strong>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-messages">
          {isLoading && <p>Loading…</p>}
          {!isLoading && !data?.length && <p>No messages</p>}
          {data?.map((m) => (
            <div
              key={m.id}
              className={`modal-msg ${m.response_type === 'user' ? 'user' : 'bot'}`}
            >
              {m.message_text}
              <time>{format(new Date(m.timestamp), 'dd MMM yyyy, HH:mm')}</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
