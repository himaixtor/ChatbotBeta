import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import api from '../utils/api';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

function renderMarkdownToHtml(markdown) {
  if (markdown == null) return '';

  let md = String(markdown).replace(/\r\n/g, '\n');

  const codeBlocks = [];
  md = md.replace(/```([\s\S]*?)```/g, (match, code) => {
    const raw = String(code || '');
    const escaped = escapeHtml(raw.replace(/^\n/, '').replace(/\n$/, ''));
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
    return `@@CODEBLOCK_${idx}@@`;
  });

  md = escapeHtml(md);
  md = md.replace(/@@CODEBLOCK_(\d+)@@/g, (_, i) => codeBlocks[Number(i)] || '');

  md = md
    .replace(/^###\s(.+)$/gim, '<h3>$1</h3>')
    .replace(/^##\s(.+)$/gim, '<h2>$1</h2>')
    .replace(/^#\s(.+)$/gim, '<h1>$1</h1>');

  md = md
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');

  md = md.replace(/`([^`]+)`/g, '<code>$1</code>');

  md = md.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  md = md.replace(/(?:^|\n)(\s*)([-*])\s+(.+)(?=\n|$)/g, (m, ws, bullet, item) => {
    return `\n@@LI@@${escapeHtml(ws)}${escapeHtml(item)}@@ENDLI@@`;
  });

  md = md.replace(
    /(?:^|\n)(@@LI@@[\s\S]*?@@ENDLI@@(?:\n@@LI@@[\s\S]*?@@ENDLI@@)*)(?:\n|$)/g,
    (block) => {
      const items = block
        .trim()
        .split(/\n(?=@@LI@@)/)
        .map((line) => line.replace(/^@@LI@@[^@]*?/, '').replace(/@@ENDLI@@$/, '').trim());
      return `<ul>${items.map((it) => `<li>${it}</li>`).join('')}</ul>`;
    }
  );

  md = md.replace(
    /\n\|([^\n]+?)\|\n\|([\s\S]+?)\|\n((?:\|[^\n]*?\|\n?)+)/g,
    (match, headerRow, sepRow, bodyRows) => {
      const splitRow = (row) => row.split('|').slice(1, -1).map((c) => c.trim());
      const headers = splitRow(headerRow);
      const body = bodyRows
        .trim()
        .split(/\n/)
        .filter(Boolean)
        .map((r) => splitRow(r));

      const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${body
        .map((cols) => `<tr>${cols.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;

      return `\n<table class="md-table">${thead}${tbody}</table>`;
    }
  );

  md = md.replace(/\n{2,}/g, '</p><p>');
  md = md.replace(/\n/g, '<br/>');

  if (!/^\s*<(h1|h2|h3|ul|pre|table)\b/i.test(md)) {
    md = `<p>${md}</p>`;
  }

  return md;
}

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
              {m.response_type === 'user' ? (
                m.message_text
              ) : (
                <div
                  className="modal-msg-content"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(m.message_text) }}
                />
              )}
              <time>{format(new Date(m.timestamp), 'dd MMM yyyy, HH:mm')}</time>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
