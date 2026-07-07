/**
 * D-ID Avatar WebRTC Client
 * Uses D-ID Client SDK for WebRTC and TTS (like agent-D)
 * SDK handles all WebRTC communication internally
 */

import { createAgentManager } from '@d-id/client-sdk';

export class AvatarRTC {
  constructor(config) {
    this.sessionId = config.sessionId;
    this.agentId = config.agentId || 'v2_agt_1jqzZB8J';
    this.clientKey = config.clientKey;
    this.videoElement = config.videoElement;

    this.agentManager = null;
    this.isConnected = false;
    this.isTalking = false;
    this.messageQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Connect to D-ID using SDK
   */
  async connect(retryCount = 0) {
    try {
      console.log(`%c[🔌 AVATAR SDK CONNECT] Initializing${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`, 'color: blue; font-weight: bold');

      if (!this.clientKey) {
        console.error('%c[🔌 AVATAR SDK CONNECT] ❌ Missing client key!', 'color: red; font-weight: bold');
        throw new Error(
          'D-ID Client Key is required for avatar. ' +
          'Get a client key from D-ID Studio (https://studio.d-id.com) and pass it in ChatbotWidget config as didClientKey.'
        );
      }

      console.log('%c[🔌 AVATAR SDK CONNECT] Client Key:', 'color: blue', this.clientKey.substring(0, 15) + '...');
      console.log('%c[🔌 AVATAR SDK CONNECT] Agent ID:', 'color: blue', this.agentId);

      // Define callbacks
      const callbacks = {
        onSrcObjectReady: (stream) => {
          console.log('%c[🎬 AVATAR SDK EVENT] onSrcObjectReady - Media stream received', 'color: green; font-weight: bold');
          console.log('%c[🎬 AVATAR SDK EVENT] Stream tracks:', 'color: green', stream.getTracks().length);
          if (this.videoElement) {
            this.videoElement.srcObject = stream;
            this.videoElement.muted = false;
            console.log('%c[🎬 AVATAR SDK EVENT] Video element configured', 'color: green');
            this.videoElement.play().catch((err) => {
              console.warn('%c[🎬 AVATAR SDK EVENT] ⚠️ Auto-play blocked:', 'color: orange', err.message);
            });
          }
        },

        onConnectionStateChange: (state) => {
          console.log('%c[🔗 AVATAR SDK EVENT] onConnectionStateChange -', 'color: purple; font-weight: bold', state);
          if (state === 'connected') {
            console.log('%c[🔗 AVATAR SDK EVENT] ✅ Connected!', 'color: green; font-weight: bold');
            this.isConnected = true;
            this.processMessageQueue();
          } else if (state === 'closed' || state === 'disconnected') {
            console.log('%c[🔗 AVATAR SDK EVENT] ❌ Disconnected!', 'color: red; font-weight: bold');
            this.isConnected = false;
          }
        },

        onVideoStateChange: (state) => {
          console.log('%c[🎥 AVATAR SDK EVENT] onVideoStateChange -', 'color: cyan', state);
        },

        onAgentActivityStateChange: (state) => {
          console.log('%c[🎭 AVATAR SDK EVENT] onAgentActivityStateChange -', 'color: cyan', state);
        },

        onError: (error) => {
          console.error('%c[❌ AVATAR SDK EVENT] onError -', 'color: red; font-weight: bold', error);
        },
      };

      // Create agent manager with SDK
      console.log('%c[🔌 AVATAR SDK CONNECT] Creating agent manager...', 'color: blue');
      this.agentManager = await createAgentManager(this.agentId, {
        auth: {
          type: 'key',
          clientKey: this.clientKey,
        },
        callbacks,
      });
      console.log('%c[🔌 AVATAR SDK CONNECT] Agent manager created and awaited', 'color: blue');

      // Connect to D-ID
      console.log('%c[🔌 AVATAR SDK CONNECT] Calling agentManager.connect()...', 'color: blue');
      await this.agentManager.connect();

      this.isConnected = true;
      console.log('%c[🔌 AVATAR SDK CONNECT] ✅ Connected to D-ID!', 'color: green; font-weight: bold');

      return true;
    } catch (error) {
      console.error('%c[🔌 AVATAR SDK CONNECT] ❌ Connection failed:', 'color: red; font-weight: bold', error.message);
      console.error('%c[🔌 AVATAR SDK CONNECT] Error details:', 'color: red', error);

      // Retry logic
      if (retryCount < 2) {
        console.log('%c[🔌 AVATAR SDK CONNECT] Retrying in 2s...', 'color: orange');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.connect(retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Send text to avatar - it will speak
   */
  async speak(text) {
    if (!text || text.trim().length === 0) {
      console.warn('%c[🗣️ AVATAR SPEAK] Empty text, skipping', 'color: orange');
      return;
    }

    // Queue message if not connected yet
    if (!this.isConnected) {
      console.log('%c[🗣️ AVATAR SPEAK] Not connected, queuing message:', 'color: orange', text.substring(0, 50) + '...');
      this.messageQueue.push(text);
      return;
    }

    try {
      if (this.isTalking) {
        console.log('%c[🗣️ AVATAR SPEAK] Currently speaking, queuing message:', 'color: orange', text.substring(0, 50) + '...');
        this.messageQueue.push(text);
        return;
      }

      this.isTalking = true;
      console.log('%c[🗣️ AVATAR SPEAK] Calling speak():', 'color: blue; font-weight: bold', text.substring(0, 60) + '...');

      // SDK's speak method
      console.log('%c[🗣️ AVATAR SPEAK] Awaiting agentManager.speak()...', 'color: blue');
      const result = await this.agentManager.speak({
        type: 'text',
        input: text,
      });

      console.log('%c[🗣️ AVATAR SPEAK] ✅ speak() completed', 'color: green; font-weight: bold');
      console.log('%c[🗣️ AVATAR SPEAK] Result:', 'color: green', result);

      // Wait before processing queue
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('%c[🗣️ AVATAR SPEAK] ❌ Speak failed:', 'color: red; font-weight: bold', error.message);
      console.error('%c[🗣️ AVATAR SPEAK] Error details:', 'color: red', error);
    } finally {
      this.isTalking = false;
      this.processMessageQueue();
    }
  }

  /**
   * Process queued messages sequentially
   */
  async processMessageQueue() {
    if (this.isProcessingQueue || this.messageQueue.length === 0 || !this.isConnected) {
      return;
    }

    this.isProcessingQueue = true;
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      try {
        await this.speak(message);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('[Avatar SDK] Error processing queue:', error.message);
      }
    }
    this.isProcessingQueue = false;
  }

  /**
   * Close connection gracefully
   */
  async disconnect() {
    try {
      console.log('%c[🔌 AVATAR DISCONNECT] Disconnecting...', 'color: blue; font-weight: bold');

      this.messageQueue = [];
      this.isTalking = false;

      // Disconnect SDK
      if (this.agentManager && typeof this.agentManager.disconnect === 'function') {
        console.log('%c[🔌 AVATAR DISCONNECT] Calling agentManager.disconnect()...', 'color: blue');
        await this.agentManager.disconnect();
        console.log('%c[🔌 AVATAR DISCONNECT] SDK disconnected', 'color: blue');
      }

      // Stop video
      if (this.videoElement && this.videoElement.srcObject) {
        const stream = this.videoElement.srcObject;
        console.log('%c[🔌 AVATAR DISCONNECT] Stopping media tracks:', 'color: blue', stream.getTracks().length);
        if (stream instanceof MediaStream) {
          stream.getTracks().forEach(track => track.stop());
        }
        this.videoElement.srcObject = null;
      }

      this.isConnected = false;
      console.log('%c[🔌 AVATAR DISCONNECT] ✅ Disconnected cleanly', 'color: green; font-weight: bold');
    } catch (error) {
      console.error('%c[🔌 AVATAR DISCONNECT] ❌ Disconnect error:', 'color: red; font-weight: bold', error.message);
      this.isConnected = false;
    }
  }
}
