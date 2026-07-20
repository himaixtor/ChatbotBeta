/**
 * UI rendering inside Shadow DOM.
 */

export function createUI(shadow, config) {
  const root = document.createElement('div');
  root.className = `widget-root pos-${config.position === 'bottom-left' ? 'bl' : 'br'}`;

  root.innerHTML = `
    <!-- Avatar Section (shown only in video mode) -->
    <div class="avatar-section" id="avatar-section" style="display:none"></div>
    <div class="panel" id="panel">
      <div class="weather-particles" id="weather-particles"></div>
      <div class="panel-header">
        <span class="bot-avatar">A</span>
        <span id="bot-title"></span>
        <button type="button" class="close-btn" id="close-btn" aria-label="Close">×</button>
      </div>
      <div class="tab-bar" id="tab-bar">
        <button type="button" class="tab-btn active" id="text-tab" data-mode="text">💬 Text</button>
        <button type="button" class="tab-btn" id="video-tab" data-mode="video">🎥 Video</button>
      </div>
      
      <div class="error-banner" id="error-banner" style="display:none">
        <span id="error-text"></span>
        <button type="button" class="retry-btn" id="retry-btn">Retry</button>
      </div>

      

      <!-- Messages Container -->
      <div class="messages" id="messages"></div>

      <!-- Quick Replies Container -->
      <div class="quick-replies" id="quick-replies" style="display:none;"></div>

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
    quickReplies: shadow.getElementById('quick-replies'),
    input: shadow.getElementById('input'),
    sendBtn: shadow.getElementById('send-btn'),
    errorBanner: shadow.getElementById('error-banner'),
    errorText: shadow.getElementById('error-text'),
    retryBtn: shadow.getElementById('retry-btn'),
    botTitle: shadow.getElementById('bot-title'),
    tabBar: shadow.getElementById('tab-bar'),
    textTab: shadow.getElementById('text-tab'),
    videoTab: shadow.getElementById('video-tab'),
    avatarSection: shadow.getElementById('avatar-section'),
    weatherParticles: shadow.getElementById('weather-particles'),
  };

  els.botTitle.textContent = config.botName;

  return els;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isImageMime(mimeType) {
  return mimeType?.startsWith('image/');
}

function isPdfMime(mimeType) {
  return mimeType === 'application/pdf';
}

function createAttachmentViewer({ fileName, mimeType, attachmentUrl, revokeOnClose, root }) {
  const label = fileName || 'Attachment';
  const overlay = document.createElement('div');
  overlay.className = 'attachment-viewer-overlay';
  overlay.setAttribute('role', 'presentation');

  const viewer = document.createElement('div');
  viewer.className = 'attachment-viewer';
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-label', `View ${label}`);

  const header = document.createElement('div');
  header.className = 'attachment-viewer-header';

  const title = document.createElement('strong');
  title.textContent = label;

  const actions = document.createElement('div');
  actions.className = 'attachment-viewer-actions';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'attachment-icon-btn';
  openBtn.textContent = 'Open';
  openBtn.title = 'Open in new tab';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'attachment-icon-btn';
  closeBtn.textContent = 'Close';
  closeBtn.setAttribute('aria-label', 'Close viewer');

  const body = document.createElement('div');
  body.className = 'attachment-viewer-body';

  if (isImageMime(mimeType)) {
    const img = document.createElement('img');
    img.src = attachmentUrl;
    img.alt = label;
    img.className = 'attachment-viewer-image';
    body.appendChild(img);
  } else if (isPdfMime(mimeType)) {
    const iframe = document.createElement('iframe');
    iframe.src = attachmentUrl;
    iframe.title = label;
    iframe.className = 'attachment-viewer-pdf';
    body.appendChild(iframe);
  } else {
    const fallback = document.createElement('p');
    fallback.textContent = 'Preview is not available for this file type.';
    body.appendChild(fallback);
  }

  const closeViewer = () => {
    overlay.remove();
    if (revokeOnClose) URL.revokeObjectURL(attachmentUrl);
  };

  openBtn.addEventListener('click', () => {
    window.open(attachmentUrl, '_blank', 'noopener,noreferrer');
  });
  closeBtn.addEventListener('click', closeViewer);
  overlay.addEventListener('click', closeViewer);
  viewer.addEventListener('click', (e) => e.stopPropagation());

  actions.appendChild(openBtn);
  actions.appendChild(closeBtn);
  header.appendChild(title);
  header.appendChild(actions);
  viewer.appendChild(header);
  viewer.appendChild(body);
  overlay.appendChild(viewer);
  root.appendChild(overlay);
}

function createFileAttachment(options) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'file-attachment';

  const label = options.fileName || 'Attachment';
  const mimeType = options.mimeType || '';
  const isImage = isImageMime(mimeType);
  const typeLabel = isImage ? 'Image' : isPdfMime(mimeType) ? 'PDF' : 'File';

  const badge = document.createElement('span');
  badge.className = 'file-attachment-badge';
  badge.textContent = isImage ? 'IMG' : typeLabel.toUpperCase();

  const meta = document.createElement('span');
  meta.className = 'file-attachment-meta';

  const name = document.createElement('span');
  name.className = 'file-attachment-name';
  name.textContent = label;

  const hint = document.createElement('span');
  hint.className = 'file-attachment-hint';
  hint.textContent = `${typeLabel} - Click to view`;

  meta.appendChild(name);
  meta.appendChild(hint);
  button.appendChild(badge);
  button.appendChild(meta);

  if (options.attachmentUrl) {
    button.dataset.attachmentUrl = options.attachmentUrl;
  }

  button.addEventListener('click', () => {
    const attachmentUrl = button.dataset.attachmentUrl;
    if (!attachmentUrl) return;
    createAttachmentViewer({
      fileName: label,
      mimeType,
      attachmentUrl,
      revokeOnClose: Boolean(options.revokeAttachmentUrlOnClose),
      root: button.getRootNode(),
    });
  });

  return button;
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

export function appendMessage(container, text, type, options = {}) {
  const div = document.createElement('div');
  div.className = `msg ${type === 'user' ? 'user' : 'bot'}`;

  if (type === 'bot') {
    div.innerHTML = renderMarkdownToHtml(text);

    if (options.askUpload && typeof options.onUpload === 'function') {
      div.appendChild(createUploadWidget(options.onUpload));
    }
  } else if (options.isFileUpload) {
    div.classList.add('file-upload');
    div.appendChild(
      createFileAttachment({
        fileName: options.fileName || text,
        mimeType: options.mimeType,
        attachmentUrl: options.attachmentUrl,
        revokeAttachmentUrlOnClose: options.revokeAttachmentUrlOnClose,
      })
    );
  } else {
    // User messages should remain plain/escaped.
    div.textContent = text;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

function createUploadWidget(onUpload) {
  const wrap = document.createElement('div');
  wrap.className = 'upload-widget';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';
  fileInput.className = 'upload-input';
  fileInput.setAttribute('aria-label', 'Upload image or PDF');

  const uploadBtn = document.createElement('button');
  uploadBtn.type = 'button';
  uploadBtn.className = 'upload-btn';
  uploadBtn.textContent = 'Upload image or PDF';

  const hint = document.createElement('span');
  hint.className = 'upload-hint';
  hint.textContent = 'One image or PDF, max 5MB';

  const errorEl = document.createElement('span');
  errorEl.className = 'upload-error';
  errorEl.hidden = true;

  uploadBtn.addEventListener('click', () => {
    if (!wrap.classList.contains('upload-done')) {
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    errorEl.hidden = true;
    errorEl.textContent = '';

    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      errorEl.textContent = 'Please upload an image (JPG, PNG, GIF, WebP) or PDF.';
      errorEl.hidden = false;
      fileInput.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      errorEl.textContent = 'File must be 5MB or smaller.';
      errorEl.hidden = false;
      fileInput.value = '';
      return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
      await onUpload(file);
      wrap.classList.add('upload-done');
      uploadBtn.textContent = 'File uploaded';
      hint.textContent = file.name;
    } catch (err) {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload image or PDF';
      errorEl.textContent = err.message || 'Upload failed. Please try again.';
      errorEl.hidden = false;
      fileInput.value = '';
    }
  });

  wrap.appendChild(fileInput);
  wrap.appendChild(uploadBtn);
  wrap.appendChild(hint);
  wrap.appendChild(errorEl);
  return wrap;
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
