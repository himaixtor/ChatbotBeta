/**
 * D-ID Avatar WebRTC Client
 * Handles WebRTC connection, video streaming, and TTS
 * Based on Integrari pattern
 */

export class AvatarRTC {
  constructor(config) {
    this.sessionId = config.sessionId;
    this.apiEndpoint = config.apiEndpoint;
    this.videoElement = config.videoElement;

    this.streamId = null;
    this.sessionToken = null;
    this.peerConnection = null;
    this.isConnected = false;
    this.isTalking = false;
    this.connectTimeout = null;
    this.messageQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Create stream and establish WebRTC connection
   */
  async connect(retryCount = 0) {
    try {
      console.log(`[Avatar] Initializing WebRTC${retryCount > 0 ? ` (retry ${retryCount})` : ''}...`);

      // Set connection timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 30s')), 30000)
      );

      // Step 1: Create stream on backend
      const streamRes = await Promise.race([
        fetch(`${this.apiEndpoint}/api/avatar/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: this.sessionId }),
        }),
        timeoutPromise
      ]);

      if (!streamRes.ok) {
        throw new Error(`Stream creation failed: ${streamRes.status} ${streamRes.statusText}`);
      }

      const streamData = await streamRes.json();
      this.streamId = streamData.stream_id;
      this.sessionToken = streamData.session_token;

      if (!this.streamId || !this.sessionToken) {
        throw new Error('Invalid stream response: missing streamId or sessionToken');
      }

      console.log('[Avatar] ✅ Stream created:', this.streamId);

      // Step 2: Setup WebRTC peer connection
      await this.setupPeerConnection(streamData.offer, streamData.ice_servers);

      this.isConnected = true;
      console.log('[Avatar] ✅ Connected to D-ID');

      // Process any queued messages
      this.processMessageQueue();

      return true;
    } catch (error) {
      console.error('[Avatar] ❌ Connection failed:', error.message);

      // Retry logic for transient failures
      if (retryCount < 2 && this.isRetryableError(error)) {
        console.log('[Avatar] Retrying connection...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.connect(retryCount + 1);
      }

      throw error;
    }
  }

  isRetryableError(error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('network') || msg.includes('econnrefused');
  }

  /**
   * Setup WebRTC peer connection
   */
  async setupPeerConnection(offer, iceServers = []) {
    try {
      if (!offer) {
        throw new Error('No offer provided from D-ID API');
      }

      // Create peer connection with ICE servers
      this.peerConnection = new RTCPeerConnection({
        iceServers: (iceServers && iceServers.length > 0) ? iceServers : [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });

      // Handle remote video stream
      this.peerConnection.ontrack = (event) => {
        console.log('[Avatar] 🎬 Received remote track:', event.track.kind);

        if (event.track.kind === 'video') {
          if (!this.videoElement) {
            console.error('[Avatar] ❌ No video element available');
            return;
          }

          try {
            const stream = new MediaStream([event.track]);
            console.log('[Avatar] ✅ Attaching video stream to element');
            this.videoElement.srcObject = stream;

            this.videoElement.play().catch((err) => {
              console.warn('[Avatar] ⚠️ Auto-play blocked:', err.message);
              // Try playing on user interaction
              this.videoElement.muted = true;
              this.videoElement.play().catch(e => console.error('[Avatar] Play failed:', e));
            });
          } catch (err) {
            console.error('[Avatar] ❌ Failed to setup video stream:', err.message);
          }
        }
      };

      // Log connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('[Avatar] Connection state:', this.peerConnection.connectionState);
      };
      this.peerConnection.onicegatheringstatechange = () => {
        console.log('[Avatar] ICE gathering state:', this.peerConnection.iceGatheringState);
      };
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[Avatar] ICE connection state:', this.peerConnection.iceConnectionState);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          await this.sendIceCandidate(event.candidate);
        }
      };

      // Set remote offer
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      console.log('[Avatar] Sending SDP answer...');
      console.log('[Avatar] Stream ID:', this.streamId);
      console.log('[Avatar] Session Token:', this.sessionToken);
      console.log('[Avatar] Answer type:', answer.type);

      const sdpRes = await fetch(`${this.apiEndpoint}/api/avatar/sdp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_id: this.streamId,
          session_token: this.sessionToken,
          answer: answer,
        }),
      });

      if (!sdpRes.ok) {
        throw new Error(`SDP answer failed: ${sdpRes.status}`);
      }

      console.log('[Avatar] SDP answer sent');
    } catch (error) {
      console.error('[Avatar] Peer connection setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Send ICE candidate
   */
  async sendIceCandidate(candidate) {
    try {
      await fetch(`${this.apiEndpoint}/api/avatar/ice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_id: this.streamId,
          session_token: this.sessionToken,
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        }),
      });
    } catch (error) {
      console.warn('[Avatar] ICE candidate send failed:', error.message);
    }
  }

  /**
   * Send text to avatar - it will speak
   */
  async speak(text) {
    if (!text || text.trim().length === 0) {
      console.warn('[Avatar] Empty text, skipping');
      return;
    }

    // Queue message if not connected yet
    if (!this.isConnected) {
      console.log('[Avatar] Not connected yet, queuing message:', text.substring(0, 50) + '...');
      this.messageQueue.push(text);
      return;
    }

    try {
      if (this.isTalking) {
        console.log('[Avatar] Currently speaking, queuing message');
        this.messageQueue.push(text);
        return;
      }

      this.isTalking = true;
      console.log('[Avatar] 🗣️ Speaking:', text.substring(0, 60) + '...');

      const talkRes = await fetch(`${this.apiEndpoint}/api/avatar/talk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream_id: this.streamId,
          session_token: this.sessionToken,
          text: text,
          session_id: this.sessionId,
        }),
      });

      if (!talkRes.ok) {
        const errorData = await talkRes.json().catch(() => ({}));
        throw new Error(`Talk request failed: ${talkRes.status} - ${errorData.error || errorData.message || ''}`);
      }

      console.log('[Avatar] ✅ Avatar is speaking');

      // Wait a bit before processing queue to allow avatar to start speaking
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('[Avatar] ❌ Speak failed:', error.message);
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
        // Wait between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('[Avatar] Error processing queue:', error.message);
      }
    }
    this.isProcessingQueue = false;
  }

  /**
   * Close connection gracefully
   */
  async disconnect() {
    try {
      console.log('[Avatar] Disconnecting...');

      // Clear any pending messages
      this.messageQueue = [];
      this.isTalking = false;

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Stop video
      if (this.videoElement && this.videoElement.srcObject) {
        const stream = this.videoElement.srcObject;
        if (stream instanceof MediaStream) {
          stream.getTracks().forEach(track => track.stop());
        }
        this.videoElement.srcObject = null;
      }

      // Notify backend to close stream
      if (this.streamId && this.sessionToken) {
        try {
          await fetch(`${this.apiEndpoint}/api/avatar/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stream_id: this.streamId,
              session_token: this.sessionToken,
              session_id: this.sessionId,
            }),
            timeout: 5000, // Don't wait too long for close confirmation
          });
        } catch (err) {
          console.warn('[Avatar] Close stream request failed (non-critical):', err.message);
        }
      }

      this.isConnected = false;
      console.log('[Avatar] ✅ Disconnected cleanly');
    } catch (error) {
      console.error('[Avatar] ❌ Disconnect error:', error.message);
      this.isConnected = false;
    }
  }
}
