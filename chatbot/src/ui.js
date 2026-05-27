/**
 * UI rendering inside Shadow DOM.
 */

export function createUI(shadow, config) {
  const root = document.createElement('div');
  root.className = `widget-root pos-${config.position === 'bottom-left' ? 'bl' : 'br'}`;

  root.innerHTML = `
    <div class="panel" id="panel">
      <div class="panel-header">
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
    <button type="button" class="bubble" id="bubble" aria-label="Open chat">💬</button>
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

export function appendMessage(container, text, type) {
  const div = document.createElement('div');
  div.className = `msg ${type === 'user' ? 'user' : 'bot'}`;
  div.textContent = text;
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
