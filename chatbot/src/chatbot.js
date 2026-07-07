/**
 * Chatbot Widget — embeddable vanilla JS library with Shadow DOM.
 * With D-ID Avatar (WebRTC) support
 */

// Set webpack public path dynamically for chunk loading
if (typeof __webpack_public_path__ !== 'undefined') {
  const scriptTag = document.currentScript || document.querySelector('script[src*="chatbot"]');
  if (scriptTag) {
    __webpack_public_path__ = scriptTag.src.replace(/chatbot\.min\.js.*/, '');
  }
}

import widgetStyles from './styles.css';
import { createApiClient } from './api.js';
import {
  createUI,
  appendMessage,
  showTyping,
  hideTyping,
  clearMessages,
} from './ui.js';
import { AvatarRTC } from './avatar-rtc.js';

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

    // Avatar state
    this.currentMode = 'text'; // 'text' or 'video'
    this.avatar = null;
    this.avatarContainer = null;
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
        config.welcomeMessage || "Hi I'm Surya! Welcome to Kirloskar Solar. How can I assist you today?",
      primaryColor: config.primaryColor || '#008C89',
      position: config.position || 'bottom-right',
      // D-ID SDK configuration
      didClientKey: config.didClientKey || null,
      didAgentId: config.didAgentId || 'v2_agt_1jqzZB8J',
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
    const { bubble, closeBtn, sendBtn, input, retryBtn, panel, textTab, videoTab } = this.els;

    // Bubble click: open chat or close if already open
    bubble.addEventListener('click', () => {
      if (panel.classList.contains('open')) {
        // Close panel if open
        panel.classList.remove('open');
        this.closeAvatarStream();
      } else {
        // Open chat if closed
        this.openChat();
      }
    });

    // Close button: close panel and cleanup
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      this.closeAvatarStream();
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

    // Tab switching
    if (textTab) {
      textTab.addEventListener('click', () => this.switchMode('text'));
    }
    if (videoTab) {
      videoTab.addEventListener('click', () => this.switchMode('video'));
    }
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
          const isFileUpload = Boolean(m.file_name);
          appendMessage(
            this.els.messages,
            isFileUpload ? m.file_name : m.message_text,
            type,
            isFileUpload
              ? {
                  isFileUpload,
                  fileName: m.file_name,
                  mimeType: m.file_mime_type,
                  attachmentUrl: this.api.getAttachmentUrl(this.sessionId, m.id),
                }
              : {}
          );
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
      this.appendBotResponse(result);
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

  appendBotResponse(result) {
    appendMessage(this.els.messages, result.response, 'bot', {
      askUpload: Boolean(result.ask_upload),
      onUpload: result.ask_upload ? (file) => this.handleFileUpload(file) : undefined,
    });

    // If in video mode, make avatar speak the response
    if (this.currentMode === 'video' && this.avatar) {
      if (this.avatar.isConnected) {
        console.log('[Avatar] Queuing response for avatar to speak');
        this.avatar.speak(result.response).catch((err) => {
          console.warn('[Avatar] Speak error (non-critical):', err.message);
        });
      } else {
        console.log('[Avatar] Avatar not connected, message will be queued');
        // The avatar will process it once connected
        this.avatar.speak(result.response).catch((err) => {
          console.warn('[Avatar] Speak error (non-critical):', err.message);
        });
      }
    }
  }

  async handleFileUpload(file) {
    if (!this.sessionId) {
      await this.ensureSession();
    }

    const previewUrl = URL.createObjectURL(file);
    const fileMessage = appendMessage(this.els.messages, file.name, 'user', {
      isFileUpload: true,
      fileName: file.name,
      mimeType: file.type,
      attachmentUrl: previewUrl,
      revokeAttachmentUrlOnClose: false,
    });
    showTyping(this.els.messages);
    this.hideError();

    try {
      const result = await this.api.uploadFile(this.sessionId, file);
      if (result.file_message?.id) {
        const attachment = fileMessage.querySelector('.file-attachment');
        if (attachment) {
          attachment.dataset.attachmentUrl = this.api.getAttachmentUrl(
            this.sessionId,
            result.file_message.id
          );
        }
        URL.revokeObjectURL(previewUrl);
      }
      hideTyping(this.els.messages);
      this.appendBotResponse(result);
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      hideTyping(this.els.messages);
      if (err.status === 410) {
        await this.createNewSession();
        appendMessage(this.els.messages, this.config.welcomeMessage, 'bot');
        this.welcomeShown = true;
        throw new Error('Session expired. Please try again.');
      }
      throw err;
    }
  }

  showError(msg) {
    this.els.errorText.textContent = msg;
    this.els.errorBanner.style.display = 'flex';
  }

  hideError() {
    this.els.errorBanner.style.display = 'none';
  }

  /**
   * Switch between text/video modes
   */
  switchMode(mode) {
    const { textTab, videoTab, input, avatarSection } = this.els;

    console.log(`%c[📱 CHATBOT MODE] Switching to ${mode} mode`, 'color: darkblue; font-weight: bold');

    // Prevent switching during avatar initialization
    if (mode === 'video' && this.avatar && !this.avatar.isConnected) {
      console.log('%c[📱 CHATBOT MODE] ⏳ Avatar still connecting, please wait...', 'color: orange');
      return;
    }

    // Update active tab
    [textTab, videoTab].forEach((btn) => btn?.classList.remove('active'));
    if (mode === 'text') textTab?.classList.add('active');
    if (mode === 'video') videoTab?.classList.add('active');

    this.currentMode = mode;

    // Update input placeholder
    if (mode === 'text') {
      console.log('%c[📱 CHATBOT MODE] ✅ Text mode activated', 'color: green');
      input.placeholder = 'Type a message...';
      // Hide avatar section in text mode
      if (avatarSection) {
        avatarSection.style.display = 'none';
      }
      this.hideError();
    } else if (mode === 'video') {
      console.log('%c[📱 CHATBOT MODE] ✅ Video mode activated', 'color: green');
      input.placeholder = 'Chat with avatar...';
      // Show avatar section
      if (avatarSection) {
        avatarSection.style.display = 'block';
      }

      // Initialize avatar on first use
      if (!this.avatar) {
        console.log('%c[📱 CHATBOT MODE] 🚀 First time in video mode, initializing avatar...', 'color: blue; font-weight: bold');
        this.initializeAvatar();
      } else if (!this.avatar.isConnected) {
        console.log('%c[📱 CHATBOT MODE] 🔄 Avatar connection lost, trying to reconnect...', 'color: blue; font-weight: bold');
        this.initializeAvatar();
      }
    }
  }

  /**
   * Initialize avatar with SDK
   */
  async initializeAvatar() {
    try {
      console.log('%c[🎯 AVATAR INIT] Starting initialization...', 'color: darkgreen; font-weight: bold');

      if (!this.sessionId) {
        console.error('%c[🎯 AVATAR INIT] ❌ No session ID!', 'color: red; font-weight: bold');
        this.showError('Session not initialized. Please refresh and try again.');
        this.switchMode('text');
        return;
      }

      console.log('%c[🎯 AVATAR INIT] Session ID:', 'color: darkgreen', this.sessionId);
      console.log('%c[🎯 AVATAR INIT] Client Key:', 'color: darkgreen', this.config.didClientKey ? this.config.didClientKey.substring(0, 15) + '...' : 'NOT SET');
      console.log('%c[🎯 AVATAR INIT] Agent ID:', 'color: darkgreen', this.config.didAgentId);

      // Create avatar container
      console.log('%c[🎯 AVATAR INIT] Creating avatar container...', 'color: darkgreen');
      this.createAvatarContainer();

      // Create SDK-based avatar client
      console.log('%c[🎯 AVATAR INIT] Creating AvatarRTC instance...', 'color: darkgreen');
      this.avatar = new AvatarRTC({
        sessionId: this.sessionId,
        agentId: this.config.didAgentId,
        clientKey: this.config.didClientKey,
        videoElement: this.avatarContainer.querySelector('video'),
      });

      // Connect to D-ID with timeout
      const connectTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Avatar connection timeout')), 35000)
      );

      try {
        console.log('%c[🎯 AVATAR INIT] Awaiting avatar.connect() with 35s timeout...', 'color: darkgreen');
        await Promise.race([this.avatar.connect(), connectTimeout]);
        console.log('%c[🎯 AVATAR INIT] ✅ Connected successfully!', 'color: green; font-weight: bold');
        this.avatarContainer.style.display = 'flex';

        // Make avatar greet user when video mode is first activated
        console.log('%c[🎯 AVATAR INIT] Starting greeting...', 'color: darkgreen');
        const greeting = this.config.welcomeMessage || "Hi I'm your avatar assistant!";
        console.log('%c[🎯 AVATAR INIT] Greeting text:', 'color: darkgreen', greeting);

        await this.avatar.speak(greeting).catch((err) => {
          console.error('%c[🎯 AVATAR INIT] ❌ Initial greeting failed:', 'color: red; font-weight: bold', err.message);
          throw err;
        });
        console.log('%c[🎯 AVATAR INIT] ✅ Greeting complete!', 'color: green; font-weight: bold');
      } catch (connectError) {
        console.error('%c[🎯 AVATAR INIT] ❌ Connect failed:', 'color: red; font-weight: bold', connectError.message);
        throw new Error(`Avatar connection failed: ${connectError.message}`);
      }
    } catch (error) {
      console.error('%c[🎯 AVATAR INIT] ❌ Initialization failed:', 'color: red; font-weight: bold', error.message);
      console.error('%c[🎯 AVATAR INIT] Stack:', 'color: red', error.stack);

      // Clean up failed avatar
      if (this.avatar) {
        try {
          console.log('%c[🎯 AVATAR INIT] Cleaning up failed avatar...', 'color: orange');
          await this.avatar.disconnect();
        } catch (err) {
          console.warn('%c[🎯 AVATAR INIT] Cleanup error:', 'color: orange', err.message);
        }
        this.avatar = null;
      }

      // Show user-friendly error and fall back to text mode
      this.showError('Video mode unavailable. Switching to text chat...');
      // Automatically switch to text mode after a short delay
      setTimeout(() => {
        console.log('%c[🎯 AVATAR INIT] Falling back to text mode', 'color: orange');
        this.switchMode('text');
      }, 2000);
    }
  }

  /**
   * Create avatar container in dedicated avatar section
   */
  createAvatarContainer() {
    if (this.avatarContainer) return;

    const container = document.createElement('div');
    container.className = 'avatar-container';

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsinline = true;
    video.muted = false;
    video.className = 'avatar-video';

    // const statusLabel = document.createElement('div');
    // statusLabel.className = 'avatar-label';
    // statusLabel.textContent = 'Video Assistant';

    // const statusDot = document.createElement('span');
    // statusDot.className = 'avatar-status-dot';

    container.appendChild(video);
    // container.appendChild(statusLabel);
    // container.appendChild(statusDot);

    // Insert into dedicated avatar section
    const avatarSection = this.els.avatarSection;
    if (avatarSection) {
      avatarSection.innerHTML = '';
      avatarSection.appendChild(container);
    }

    this.avatarContainer = container;
  }

  /**
   * Close avatar on panel close
   */
  async closeAvatarStream() {
    try {
      if (this.avatar) {
        await this.avatar.disconnect();
        this.avatar = null;
      }

      if (this.avatarContainer) {
        this.avatarContainer.style.display = 'none';
      }
    } catch (error) {
      console.warn('[Avatar] Close error:', error.message);
    }
  }
}

const ChatbotWidget = new ChatbotWidgetClass();

export default {
  init: (config) => ChatbotWidget.init(config),
};

if (typeof window !== 'undefined') {
  window.ChatbotWidget = { init: (config) => ChatbotWidget.init(config) };
}
