/**
 * D-ID Avatar WebRTC Client
 * Uses D-ID Client SDK for WebRTC and TTS (like agent-D)
 * SDK handles all WebRTC communication internally
 */

import { createAgentManager } from '@d-id/client-sdk';

export class AvatarRTC {
  constructor(config) {
    this.sessionId = config.sessionId;
    this.agentId = config.agentId || 'v2_agt_hOsF1A8R';
    this.clientKey = config.clientKey;
    this.videoElement = config.videoElement;

    this.agentManager = null;
    this.isConnected = false;
    this.isTalking = false;
    this.messageQueue = [];
    this.isProcessingQueue = false;

    // Network state tracking
    this.connectionAttempts = 0;
    this.isOnRegionalEndpoint = false;
    this.lastStreamErrorTime = 0;
    this.lastSDKError = null;
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
          // Store error so speak() method can detect and handle it
          this.lastSDKError = error;
          this.lastStreamErrorTime = Date.now();
          this.isOnRegionalEndpoint = true;
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

      // Add timeout for connection attempt (50s for remote with potential regional fallback)
      const connectPromise = this.agentManager.connect();
      const timeoutMs = 60000; // 60s timeout
      const connectWithTimeout = Promise.race([
        connectPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout - may be attempting regional fallback')), timeoutMs)
        )
      ]);

      await connectWithTimeout;

      this.isConnected = true;
      console.log('%c[🔌 AVATAR SDK CONNECT] ✅ Connected to D-ID!', 'color: green; font-weight: bold');
      console.log('%c[🔌 AVATAR SDK CONNECT] Connection may be on regional endpoint (this is OK for video)', 'color: green');

      return true;
    } catch (error) {
      console.error(`%c[🔌 AVATAR SDK CONNECT] ❌ Connection failed (Attempt ${retryCount + 1}):`, 'color: red; font-weight: bold', error.message);

      // Retry logic - more aggressive for WebSocket errors
      const isWebSocketError = error.message?.includes('websocket') || error.message?.includes('signal');

      if (retryCount < 4) {
        // Progressive backoff: 3s, 5s, 8s, 12s
        const delayMs = [3000, 5000, 8000, 12000][retryCount] || 15000;
        console.log(`%c[🔌 AVATAR SDK CONNECT] Retrying in ${delayMs}ms (attempt ${retryCount + 1}/5)...`, 'color: orange');
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.connect(retryCount + 1);
      }

      console.error('%c[🔌 AVATAR SDK CONNECT] ❌ Connection failed after 5 attempts', 'color: red; font-weight: bold');
      throw error;
    }
  }

  /**
   * Send text to avatar - it will speak (with aggressive retry for remote servers)
   */
  async speak(text, retryCount = 0) {
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
      if (this.isTalking && retryCount === 0) {
        console.log('%c[🗣️ AVATAR SPEAK] Currently speaking, queuing message:', 'color: orange', text.substring(0, 50) + '...');
        this.messageQueue.push(text);
        return;
      }

      this.isTalking = true;
      console.log(`%c[🗣️ AVATAR SPEAK] Calling speak() [Attempt ${retryCount + 1}]:`, 'color: blue; font-weight: bold', text.substring(0, 60) + '...');

      if (this.isOnRegionalEndpoint) {
        console.log('%c[🗣️ AVATAR SPEAK] ⚠️ Using regional endpoint - stream may be unstable', 'color: orange');
      }

      // SDK's speak method
      console.log('%c[🗣️ AVATAR SPEAK] Awaiting agentManager.speak()...', 'color: blue');
      const result = await this.agentManager.speak({
        type: 'text',
        input: text,
      });

      // Check if SDK error occurred during speak (async error through callback)
      if (this.lastSDKError) {
        console.error('%c[🗣️ AVATAR SPEAK] ❌ SDK error detected after speak():', 'color: red; font-weight: bold', this.lastSDKError);
        const errorToThrow = this.lastSDKError;
        this.lastSDKError = null; // Clear for next attempt
        throw new Error(`Stream error: ${errorToThrow}`);
      }

      console.log('%c[🗣️ AVATAR SPEAK] ✅ speak() completed successfully!', 'color: green; font-weight: bold');
      console.log('%c[🗣️ AVATAR SPEAK] Result:', 'color: green', result);

      // Reset stream error tracking on success
      this.lastStreamErrorTime = 0;

      // Wait before processing queue
      await new Promise(resolve => setTimeout(resolve, 500));
      return result;
    } catch (error) {
      console.error(`%c[🗣️ AVATAR SPEAK] ❌ Speak failed (Attempt ${retryCount + 1}):`, 'color: red; font-weight: bold', error.message);
      console.error('%c[🗣️ AVATAR SPEAK] Full error:', 'color: red', error.toString());

      // Check if it's a stream error (audio issue on regional endpoint)
      const isStreamError =
        error.message?.includes('Stream') ||
        error.message?.includes('stream') ||
        error.toString()?.includes('d:') ||
        error.toString()?.includes('We:') ||
        error.toString()?.includes('ICE') ||
        error.toString()?.includes('DTLS') ||
        error.toString()?.includes('WebSocket');

      const isNetworkError =
        error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.message?.includes('CORS') ||
        error.toString()?.includes('ERR_NETWORK');

      if (isStreamError || isNetworkError) {
        this.lastStreamErrorTime = Date.now();
        this.isOnRegionalEndpoint = true;
        console.warn('%c[🗣️ AVATAR SPEAK] ⚠️ Stream/Network error - likely regional endpoint issue', 'color: orange; font-weight: bold');
        console.log('%c[🗣️ AVATAR SPEAK] Error classification:', 'color: orange',
          isStreamError ? 'STREAM_ERROR' : 'NETWORK_ERROR');

        // Aggressive retry strategy for stream errors
        if (retryCount === 0) {
          console.log('%c[🗣️ AVATAR SPEAK] Waiting 8s for stream to initialize...', 'color: orange');
          this.isTalking = false;
          await new Promise(resolve => setTimeout(resolve, 8000));
          return this.speak(text, retryCount + 1);
        } else if (retryCount === 1) {
          console.log('%c[🗣️ AVATAR SPEAK] Waiting 12s for stream recovery...', 'color: orange');
          this.isTalking = false;
          await new Promise(resolve => setTimeout(resolve, 12000));
          return this.speak(text, retryCount + 1);
        } else if (retryCount === 2) {
          console.log('%c[🗣️ AVATAR SPEAK] Waiting 15s for deeper recovery...', 'color: orange');
          this.isTalking = false;
          await new Promise(resolve => setTimeout(resolve, 15000));
          return this.speak(text, retryCount + 1);
        } else if (retryCount === 3) {
          console.log('%c[🗣️ AVATAR SPEAK] Final attempt: waiting 20s...', 'color: orange');
          this.isTalking = false;
          await new Promise(resolve => setTimeout(resolve, 20000));
          return this.speak(text, retryCount + 1);
        } else if (retryCount >= 4) {
          console.error('%c[🗣️ AVATAR SPEAK] ❌ ALL RETRIES EXHAUSTED (5 attempts)', 'color: red; font-weight: bold');
          console.error('%c[🗣️ AVATAR SPEAK] This appears to be a persistent audio/stream issue', 'color: red');
          console.error('%c[🗣️ AVATAR SPEAK] RECOMMENDATION: Check network connectivity to D-ID servers', 'color: red; font-weight: bold');
          console.error('%c[🗣️ AVATAR SPEAK] Your server may not have stable access to USA-based LiveKit endpoints', 'color: red; font-weight: bold');
          return null;
        }
      }

      // For non-stream errors, do limited retries
      if (retryCount < 2) {
        const delayMs = 3000 + (retryCount * 2000);
        console.log(`%c[🗣️ AVATAR SPEAK] Retrying in ${delayMs}ms...`, 'color: orange');
        this.isTalking = false;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.speak(text, retryCount + 1);
      }

      console.error('%c[🗣️ AVATAR SPEAK] Error details:', 'color: red', error);
      return null;
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

  /**
   * Diagnostic method to check network connectivity
   */
  async diagnoseNetwork() {
    console.log('%c[🔍 NETWORK DIAGNOSTIC] Starting network check...', 'color: purple; font-weight: bold');

    const diagnostics = {
      timestamp: new Date().toISOString(),
      isConnected: this.isConnected,
      isOnRegionalEndpoint: this.isOnRegionalEndpoint,
      connectionAttempts: this.connectionAttempts,
      lastStreamError: this.lastStreamErrorTime ? new Date(this.lastStreamErrorTime).toISOString() : null,
    };

    try {
      const res = await fetch('https://api.d-id.com/ping', { method: 'HEAD', mode: 'no-cors' });
      diagnostics.canReachDID = true;
      console.log('%c[🔍 NETWORK DIAGNOSTIC] ✅ Can reach D-ID API', 'color: green');
    } catch (e) {
      diagnostics.canReachDID = false;
      console.warn('%c[🔍 NETWORK DIAGNOSTIC] ❌ Cannot reach D-ID API:', 'color: red', e.message);
    }

    try {
      const res = await fetch('https://stun.l.google.com/', { method: 'HEAD', mode: 'no-cors' });
      diagnostics.canReachSTUN = true;
      console.log('%c[🔍 NETWORK DIAGNOSTIC] ✅ Can reach STUN server', 'color: green');
    } catch (e) {
      diagnostics.canReachSTUN = false;
      console.warn('%c[🔍 NETWORK DIAGNOSTIC] ❌ Cannot reach STUN server:', 'color: red', e.message);
    }

    console.log('%c[🔍 NETWORK DIAGNOSTIC] Results:', 'color: purple', diagnostics);
    return diagnostics;
  }
}
