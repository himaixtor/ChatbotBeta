/**
 * UI rendering inside Shadow DOM.
 */

export function createUI(shadow, config) {
  const root = document.createElement('div');
  root.className = `widget-root pos-${config.position === 'bottom-left' ? 'bl' : 'br'}`;

  root.innerHTML = `
    <div class="panel" id="panel">
      <div class="panel-header">
        <span class="bot-avatar">A</span>
        <span id="bot-title"></span>
        <button type="button" class="close-btn" id="close-btn" aria-label="Close">×</button>
      </div>
      <div class="error-banner" id="error-banner" style="display:none">
        <span id="error-text"></span>
        <button type="button" class="retry-btn" id="retry-btn">Retry</button>
      </div>
      <div class="messages" id="messages"></div>
      <div class="input-area">
        <textarea id="input" rows="2" maxlength="500" placeholder="Type a message..."></textarea>
        <button type="button" class="send-btn" id="send-btn">Send</button>
      </div>
    </div>
    <button type="button" class="bubble" id="bubble" aria-label="Open chat">
      <span>A</span>
    </button>
  `;

  shadow.appendChild(root);

  const els = {
    panel: shadow.getElementById('panel'),
    bubble: shadow.getElementById('bubble'),
    closeBtn: shadow.getElementById('close-btn'),
    messages: shadow.getElementById('messages'),
    input: shadow.getElementById('input'),
    sendBtn: shadow.getElementById('send-btn'),
    errorBanner: shadow.getElementById('error-banner'),
    errorText: shadow.getElementById('error-text'),
    retryBtn: shadow.getElementById('retry-btn'),
    botTitle: shadow.getElementById('bot-title'),
  };

  els.botTitle.textContent = config.botName;

  return els;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

// Minimal safe markdown renderer for widget responses.
// - Escapes HTML first (prevents injection)
// - Supports: headings, bold/italic, inline code, links, lists, fenced code blocks, tables (basic)
function renderMarkdownToHtml(markdown) {
  if (markdown == null) return '';

  // Normalize newlines
  let md = String(markdown).replace(/\r\n/g, '\n');

  // Extract fenced code blocks first to avoid inline formatting inside code.
  const codeBlocks = [];
  md = md.replace(/```([\s\S]*?)```/g, (match, code) => {
    const raw = String(code || '');
    const escaped = escapeHtml(raw.replace(/^\n/, '').replace(/\n$/, ''));
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escaped}</code></pre>`);
    return `@@CODEBLOCK_${idx}@@`;
  });

  // Escape everything else, then we re-inject code blocks.
  md = escapeHtml(md);

  // Re-inject code blocks (already escaped)
  md = md.replace(/@@CODEBLOCK_(\d+)@@/g, (_, i) => codeBlocks[Number(i)] || '');

  // Headings
  md = md
    .replace(/^###\s(.+)$/gim, '<h3>$1</h3>')
    .replace(/^##\s(.+)$/gim, '<h2>$1</h2>')
    .replace(/^#\s(.+)$/gim, '<h1>$1</h1>');

  // Bold / Italic
  md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  md = md.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  md = md.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Inline code
  md = md.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links: [text](url)
  md = md.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Lists
  // Convert simple unordered lists: lines starting with - or *
  md = md.replace(/(?:^|\n)(\s*)([-*])\s+(.+)(?=\n|$)/g, (m, ws, bullet, item) => {
    // We'll wrap consecutive lines later; for now mark each item.
    return `\n@@LI@@${escapeHtml(ws)}${escapeHtml(item)}@@ENDLI@@`;
  });

  // Wrap marked list items into <ul>
  md = md.replace(/(?:^|\n)(@@LI@@[\s\S]*?@@ENDLI@@(?:\n@@LI@@[\s\S]*?@@ENDLI@@)*)(?:\n|$)/g, (block) => {
    const items = block
      .trim()
      .split(/\n(?=@@LI@@)/)
      .map((line) => line.replace(/^@@LI@@[^@]*?/, '').replace(/@@ENDLI@@$/, '').trim());
    return `<ul>${items.map((it) => `<li>${it}</li>`).join('')}</ul>`;
  });

  // Tables (basic GitHub-flavored):
  // | a | b |
  // |---|---|
  // | c | d |
  // We'll handle only simple single table blocks.
  md = md.replace(
    /\n\|([^\n]+?)\|\n\|([\s\S]+?)\|\n((?:\|[^\n]*?\|\n?)+)/g,
    (match, headerRow, sepRow, bodyRows) => {
      const splitRow = (row) =>
        row
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

      const headers = splitRow(headerRow);
      const body = bodyRows
        .trim()
        .split(/\n/)
        .filter(Boolean)
        .map((r) => splitRow(r));

      const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${body.map((cols) => `<tr>${cols.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `\n<table class="md-table">${thead}${tbody}</table>`;
    }
  );

  // Paragraphs / line breaks: keep things simple.
  // If we have block tags already, just preserve newlines around them.
  md = md.replace(/\n{2,}/g, '</p><p>');
  md = md.replace(/\n/g, '<br/>');

  // Wrap everything in a single <p> if it doesn't already start with a block element.
  if (!/^\s*<(h1|h2|h3|ul|pre|table)\b/i.test(md)) {
    md = `<p>${md}</p>`;
  }

  return md;
}

export function appendMessage(container, text, type) {
  const div = document.createElement('div');
  div.className = `msg ${type === 'user' ? 'user' : 'bot'}`;

  if (type === 'bot') {
    div.innerHTML = renderMarkdownToHtml(text);
  } else {
    // User messages should remain plain/escaped.
    div.textContent = text;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}


export function showTyping(container) {
  const el = document.createElement('div');
  el.className = 'typing';
  el.id = 'typing-indicator';
  el.innerHTML = '<span></span><span></span><span></span>';
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

export function hideTyping(container) {
  const el = container.querySelector('#typing-indicator');
  if (el) el.remove();
}

export function clearMessages(container) {
  container.innerHTML = '';
}
