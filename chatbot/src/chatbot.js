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
    this.feedbackShown = false;

    // Weather & Location State
    this.locationData = null;
    this.weatherData = null;
    this.weatherLoaded = false;
    this.rainInterval = null;

    // Avatar state
    this.currentMode = 'text'; // 'text' or 'video'
    this.avatar = null;
    this.avatarContainer = null;
  }

  /**
   * Initialize widget on the host page.
   * @param {Object} config
   */
  async init(config) {
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
      // D-ID SDK configuration (will be fetched from backend)
      didClientKey: config.didClientKey || 'ck_k-4TlZBe0ltKyhI6MYIG7',
      didAgentId: config.didAgentId || 'v2_agt_qlftkgx6',
    };

    this.api = createApiClient(this.config.apiEndpoint);

    // Fetch D-ID client key from backend if not provided
    if (!this.config.didClientKey) {
      console.log('%c[🔑 AVATAR CONFIG] Fetching D-ID configuration from backend...', 'color: blue; font-weight: bold');
      await this.fetchAvatarConfig();
    }

    const host = document.createElement('div');
    host.id = 'chatbot-widget-host';
    document.body.appendChild(host);
    this.shadow = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = `${widgetStyles}\n:host { --primary: ${this.config.primaryColor}; --user-bg: ${this.config.primaryColor}; }`;
    this.shadow.appendChild(styleEl);

    this.els = createUI(this.shadow, this.config);
    this.bindEvents();

    // Fetch location and weather in background
    this.fetchLocationAndWeather();
  }

  /**
   * Fetch D-ID avatar configuration from backend
   */
  async fetchAvatarConfig() {
    try {
      const backendUrl = this.config.apiEndpoint;
      const url = `${backendUrl}/api/session/avatar-config`;
      console.log('%c[🔑 AVATAR CONFIG] Request URL:', 'color: blue', url);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('%c[🔑 AVATAR CONFIG] Response status:', 'color: orange', response.status);
        throw new Error(`Avatar config returned ${response.status}`);
      }

      const data = await response.json();
      console.log('%c[🔑 AVATAR CONFIG] ✅ Fetched successfully', 'color: green; font-weight: bold');
      console.log('%c[🔑 AVATAR CONFIG] Agent ID:', 'color: green', data.agentId);

      if (data.clientKey) {
        this.config.didClientKey = data.clientKey;
        console.log('%c[🔑 AVATAR CONFIG] Client Key loaded:', 'color: green', data.clientKey.substring(0, 15) + '...');
      }

      if (data.agentId) {
        this.config.didAgentId = data.agentId;
      }
    } catch (error) {
      console.error('%c[🔑 AVATAR CONFIG] ❌ Failed to fetch:', 'color: red; font-weight: bold', error.message);
      console.warn('%c[🔑 AVATAR CONFIG] Avatar features will be unavailable', 'color: orange');
    }
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

    // Close button: show feedback on first click, close on second click or if feedback shown
    closeBtn.addEventListener('click', () => {
      if (this.feedbackShown) {
        // If feedback already shown, close the chat
        this.closeChatNow();
      } else {
        // Show feedback on first close attempt
        this.showFeedback();
        this.feedbackShown = true;
      }
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

    // Watch for manual class changes (for debugging/testing)
    this.watchWeatherClassChanges(panel);
  }

  watchWeatherClassChanges(panel) {
    const observer = new MutationObserver(() => {
      const hasRainy = panel.classList.contains('weather-rainy');
      if (hasRainy) {
        this.startRainAnimation();
      } else {
        this.stopRainAnimation();
      }
    });

    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  async openChat() {
    this.els.panel.classList.add('open');
    if (!this.sessionId) {
      await this.ensureSession();
    }
    if (!this.welcomeShown) {
      const welcome = this.generateWelcomeMessage();
      appendMessage(this.els.messages, welcome, 'bot');
      this.showQuickReplies();
      this.welcomeShown = true;
      this.applyWeatherTheme();
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
    this.feedbackShown = false;
  }

  async loadHistory() {
    try {
      const { messages } = await this.api.getHistory(this.sessionId);
      clearMessages(this.els.messages);
      this.els.quickReplies.innerHTML = '';
      this.els.quickReplies.style.display = 'none';

      if (messages?.length) {
        this.welcomeShown = true;

        // Ensure location/weather is loaded so we can substitute the welcome message
        if (!this.weatherLoaded) {
          let count = 0;
          while (!this.weatherLoaded && count < 15) {
            await new Promise((r) => setTimeout(r, 100));
            count++;
          }
        }

        for (let i = 0; i < messages.length; i++) {
          const m = messages[i];
          const type = m.response_type === 'user' ? 'user' : 'bot';
          const isFileUpload = Boolean(m.file_name);

          let text = m.message_text;
          // Intercept the default database welcome message and replace it with the dynamic one
          if (i === 0 && type === 'bot' && text.includes('Kirloskar Solar')) {
            text = this.generateWelcomeMessage();
          }

          appendMessage(
            this.els.messages,
            isFileUpload ? m.file_name : text,
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

        // Show quick replies after loading history
        this.showQuickReplies();
        this.applyWeatherTheme();
      }
    } catch (err) {
      console.warn('[loadHistory] failed, recreating session', err);
      await this.createNewSession();
    }
  }

  async handleSend() {
    const text = this.els.input.value.trim();
    if (!text || text.length > 500) return;

    this.els.input.value = '';
    this.els.sendBtn.disabled = true;

    // Hide quick replies when user sends a message
    this.els.quickReplies.style.display = 'none';

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
        const welcome = this.generateWelcomeMessage();
        appendMessage(this.els.messages, welcome, 'bot');
        this.welcomeShown = true;
        this.applyWeatherTheme();
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

    // Show quick replies after each bot message
    this.showQuickReplies();

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
        const welcome = this.generateWelcomeMessage();
        appendMessage(this.els.messages, welcome, 'bot');
        this.welcomeShown = true;
        this.applyWeatherTheme();
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
        const greeting = this.generateWelcomeMessage();
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

  async fetchLocationAndWeather() {
    try {
      const loc = await getUserLocation();
      this.locationData = loc;
      if (loc && loc.latitude && loc.longitude) {
        const weather = await getWeather(loc.latitude, loc.longitude);
        this.weatherData = weather;
      }
    } catch (e) {
      console.error('%c[🌦️ WEATHER] ❌ Error fetching location/weather:', 'color: red; font-weight: bold', e);
    } finally {
      this.weatherLoaded = true;
      this.applyWeatherTheme();
    }
  }

  getWeatherTheme() {
    if (!this.weatherData) {
      const month = new Date().getMonth();
      if (month === 11 || month === 0 || month === 1) return 'snowy';
      if (month >= 2 && month <= 4) return 'spring';
      if (month >= 6 && month <= 8) return 'rainy';
      return 'sunny';
    }

    const condition = this.weatherData.condition?.toLowerCase() || '';
    const temp = this.weatherData.temp;
    const month = new Date().getMonth();

    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      return 'rainy';
    }
    if (condition.includes('snow') || condition.includes('sleet') || condition.includes('blizzard')) {
      return 'snowy';
    }
    if (condition.includes('thunderstorm') || condition.includes('thunder')) {
      return 'thunderstorm';
    }
    if (condition.includes('cloud') || condition.includes('overcast') || condition.includes('mist') || condition.includes('fog') || condition.includes('haze')) {
      return 'cloudy';
    }
    if (temp < 15) {
      return 'snowy';
    }
    if (month >= 1 && month <= 3) {
      return 'spring';
    }
    return 'sunny';
  }

  generateWelcomeMessage() {
    const hours = new Date().getHours();
    let timeGreeting = 'Hi';
    if (hours >= 5 && hours < 12) {
      timeGreeting = 'Good Morning';
    } else if (hours >= 12 && hours < 17) {
      timeGreeting = 'Good Afternoon';
    } else if (hours >= 17 && hours < 21) {
      timeGreeting = 'Good Evening';
    } else {
      timeGreeting = 'Good Night';
    }

    return `${timeGreeting}! I'm Surya from Kirloskar Solar. How can I help?`;
  }

  applyWeatherTheme() {
    if (!this.els?.panel) return;

    // Remove existing weather classes from panel
    this.els.panel.classList.remove(
      'weather-sunny',
      'weather-cloudy',
      'weather-rainy',
      'weather-snowy',
      'weather-thunderstorm',
      'weather-spring'
    );

    const theme = this.getWeatherTheme();
    this.els.panel.classList.add(`weather-${theme}`);

    // Start/stop rain animation based on theme
    if (theme === 'rainy') {
      this.startRainAnimation();
    } else {
      this.stopRainAnimation();
    }
  }

  // Test method: force rainy theme for debugging
  forceRainyTheme() {
    if (!this.els?.panel) return;
    this.els.panel.classList.remove('weather-sunny', 'weather-cloudy', 'weather-snowy', 'weather-thunderstorm', 'weather-spring');
    this.els.panel.classList.add('weather-rainy');
    this.startRainAnimation();
  }

  startRainAnimation() {
    if (this.rainInterval) return; // Already running

    if (!this.els?.weatherParticles) return;

    this.els.weatherParticles.innerHTML = '';

    const createRaindrop = () => {
      const raindrop = document.createElement('div');
      raindrop.className = 'raindrop';
      raindrop.style.left = Math.random() * 100 + '%';
      const duration = Math.random() * 1 + 0.8; // 0.8-1.8 seconds - faster
      raindrop.style.animationDuration = duration + 's';
      this.els.weatherParticles.appendChild(raindrop);

      setTimeout(() => {
        raindrop.remove();
      }, duration * 1000);
    };

    // Create initial raindrops
    for (let i = 0; i < 6; i++) {
      setTimeout(() => createRaindrop(), i * 50);
    }

    // Keep creating new raindrops - more frequently
    this.rainInterval = setInterval(createRaindrop, 80);
  }

  stopRainAnimation() {
    if (this.rainInterval) {
      clearInterval(this.rainInterval);
      this.rainInterval = null;
    }

    if (this.els?.weatherParticles) {
      this.els.weatherParticles.innerHTML = '';
    }
  }

  showQuickReplies() {
    const container = this.els.quickReplies;
    const quickReplies = [
      'What is solar energy?',
      'How much does a solar system cost?',
      'What are the benefits of solar?'
    ];

    container.innerHTML = '';
    quickReplies.forEach((reply) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-reply-btn';
      btn.textContent = reply;
      btn.addEventListener('click', () => {
        this.els.input.value = reply;
        this.handleSend();
      });
      container.appendChild(btn);
    });

    container.style.display = 'flex';
  }

  showFeedback() {
    const container = this.els.messages;
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'feedback-widget';

    const label = document.createElement('div');
    label.className = 'feedback-label';
    label.textContent = 'How was your experience?';

    const emojisDiv = document.createElement('div');
    emojisDiv.className = 'feedback-emojis';

    const emojis = [
      { emoji: '😞', rating: 1, label: 'Bad' },
      { emoji: '😕', rating: 2, label: 'Poor' },
      { emoji: '😐', rating: 3, label: 'Ok' },
      { emoji: '😊', rating: 4, label: 'Good' },
      { emoji: '😍', rating: 5, label: 'Excellent' }
    ];

    emojis.forEach(({ emoji, rating, label: emojiLabel }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-btn';
      btn.title = emojiLabel;
      btn.innerHTML = emoji;
      btn.dataset.rating = rating;
      btn.addEventListener('click', () => this.submitFeedback(rating));
      emojisDiv.appendChild(btn);
    });

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'feedback-skip-btn';
    skipBtn.textContent = 'Skip';
    skipBtn.addEventListener('click', () => this.closeChatNow());

    feedbackDiv.appendChild(label);
    feedbackDiv.appendChild(emojisDiv);
    feedbackDiv.appendChild(skipBtn);
    container.appendChild(feedbackDiv);
    container.scrollTop = container.scrollHeight;
  }

  closeChatNow() {
    this.els.panel.classList.remove('open');
    this.closeAvatarStream();
  }

  async submitFeedback(rating) {
    try {
      await this.api.submitFeedback(this.sessionId, rating);
      const feedbackWidget = this.els.messages.querySelector('.feedback-widget');
      if (feedbackWidget) {
        feedbackWidget.innerHTML = '<div class="feedback-thanks">Thank you for your feedback! 🙏</div>';
      }
      setTimeout(() => {
        this.els.panel.classList.remove('open');
        this.closeAvatarStream();
      }, 1500);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  }
}

async function getUserLocation() {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            city: null
          });
        },
        async () => {
          const ipLoc = await fetchIpLocation();
          resolve(ipLoc);
        },
        { timeout: 5000 }
      );
    } else {
      fetchIpLocation().then(resolve);
    }
  });
}

async function fetchIpLocation() {
  try {
    // Get backend URL dynamically (same as admin panel)
    const backendUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
    const res = await fetch(`${backendUrl}/api/session/ip-location`);
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || null
        };
      }
    }
  } catch (e) {
    console.warn('IP geolocation failed, trying backup...', e);
  }
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || null
        };
      }
    }
  } catch (e) {
    console.warn('Backup IP geolocation failed', e);
  }
  // Default fallback: Pune, India
  return {
    latitude: 18.5204,
    longitude: 73.8567,
    city: 'Pune'
  };
}

async function getWeather(latitude, longitude) {
  try {
    const backendUrl = 'http://localhost:5000/api/weather';
    const url = `${backendUrl}?latitude=${latitude}&longitude=${longitude}`;
    const res = await fetch(url);
    if (!res.ok) { 
      throw new Error(`Weather API returned status ${res.status}`);
    }
    const data = await res.json();
    return {
      temp: data.temp,
      condition: data.condition,
      description: data.description,
      city: data.city
    };
  } catch (e) {
    return null;
  }
}

const ChatbotWidget = new ChatbotWidgetClass();

export default {
  init: (config) => ChatbotWidget.init(config),
  forceRainyTheme: () => ChatbotWidget.forceRainyTheme(),
};

if (typeof window !== 'undefined') {
  window.ChatbotWidget = {
    init: (config) => ChatbotWidget.init(config),
    forceRainyTheme: () => ChatbotWidget.forceRainyTheme(),
  };
}
