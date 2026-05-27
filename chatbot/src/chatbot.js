/**
 * Chatbot Widget — embeddable vanilla JS library with Shadow DOM.
 */
import widgetStyles from './styles.css';
import { createApiClient } from './api.js';
import {
  createUI,
  appendMessage,
  showTyping,
  hideTyping,
  clearMessages,
} from './ui.js';

const COOKIE_NAME = 'chatbot_session_id';
const COOKIE_MAX_AGE = 24 * 60 * 60;

function setCookie(name, value, maxAgeSeconds) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

class ChatbotWidgetClass {
  constructor() {
    this.config = null;
    this.api = null;
    this.sessionId = null;
    this.shadow = null;
    this.els = null;
    this.pendingMessage = null;
    this.welcomeShown = false;
  }

  /**
   * Initialize widget on the host page.
   * @param {Object} config
   */
  init(config) {
    if (!config?.apiEndpoint) {
      console.error('ChatbotWidget: apiEndpoint is required');
      return;
    }

    this.config = {
      apiEndpoint: config.apiEndpoint,
      botName: config.botName || 'Support Bot',
      welcomeMessage:
        config.welcomeMessage || 'Hi! How can I help you today?',
      primaryColor: config.primaryColor || '#3B82F6',
      position: config.position || 'bottom-right',
    };

    this.api = createApiClient(this.config.apiEndpoint);

    const host = document.createElement('div');
    host.id = 'chatbot-widget-host';
    document.body.appendChild(host);
    this.shadow = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = `${widgetStyles}\n:host { --primary: ${this.config.primaryColor}; --user-bg: ${this.config.primaryColor}; }`;
    this.shadow.appendChild(styleEl);

    this.els = createUI(this.shadow, this.config);
    this.bindEvents();
  }

  bindEvents() {
    const { bubble, closeBtn, sendBtn, input, retryBtn, panel } = this.els;

    bubble.addEventListener('click', () => this.openChat());
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
    });
    sendBtn.addEventListener('click', () => this.handleSend());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });
    retryBtn.addEventListener('click', () => {
      this.hideError();
      if (this.pendingMessage) {
        this.sendUserMessage(this.pendingMessage);
      }
    });
  }

  async openChat() {
    this.els.panel.classList.add('open');
    if (!this.sessionId) {
      await this.ensureSession();
    }
    if (!this.welcomeShown) {
      appendMessage(this.els.messages, this.config.welcomeMessage, 'bot');
      this.welcomeShown = true;
    }
  }

  async ensureSession() {
    const existing = getCookie(COOKIE_NAME);
    if (existing) {
      try {
        const result = await this.api.validateSession(existing);
        if (result.valid) {
          this.sessionId = existing;
          setCookie(COOKIE_NAME, existing, COOKIE_MAX_AGE);
          await this.loadHistory();
          return;
        }
      } catch {
        /* expired or invalid — create new */
      }
    }
    await this.createNewSession();
  }

  async createNewSession() {
    const { session_id } = await this.api.createSession();
    this.sessionId = session_id;
    setCookie(COOKIE_NAME, session_id, COOKIE_MAX_AGE);
    clearMessages(this.els.messages);
    this.welcomeShown = false;
  }

  async loadHistory() {
    try {
      const { messages } = await this.api.getHistory(this.sessionId);
      clearMessages(this.els.messages);
      if (messages?.length) {
        this.welcomeShown = true;
        for (const m of messages) {
          const type = m.response_type === 'user' ? 'user' : 'bot';
          appendMessage(this.els.messages, m.message_text, type);
        }
      }
    } catch {
      await this.createNewSession();
    }
  }

  async handleSend() {
    const text = this.els.input.value.trim();
    if (!text || text.length > 500) return;

    this.els.input.value = '';
    this.els.sendBtn.disabled = true;

    if (!this.sessionId) {
      await this.ensureSession();
    }

    await this.sendUserMessage(text);
    this.els.sendBtn.disabled = false;
  }

  async sendUserMessage(text) {
    this.pendingMessage = text;
    appendMessage(this.els.messages, text, 'user');
    showTyping(this.els.messages);
    this.hideError();

    try {
      const result = await this.api.sendMessage(this.sessionId, text);
      hideTyping(this.els.messages);
      appendMessage(this.els.messages, result.response, 'bot');
      this.pendingMessage = null;
    } catch (err) {
      hideTyping(this.els.messages);
      if (err.status === 410) {
        await this.createNewSession();
        appendMessage(this.els.messages, this.config.welcomeMessage, 'bot');
        this.welcomeShown = true;
        return this.sendUserMessage(text);
      }
      this.showError('Failed to send message. Please try again.');
    }
  }

  showError(msg) {
    this.els.errorText.textContent = msg;
    this.els.errorBanner.style.display = 'flex';
  }

  hideError() {
    this.els.errorBanner.style.display = 'none';
  }
}

const ChatbotWidget = new ChatbotWidgetClass();

export default {
  init: (config) => ChatbotWidget.init(config),
};

if (typeof window !== 'undefined') {
  window.ChatbotWidget = { init: (config) => ChatbotWidget.init(config) };
}
