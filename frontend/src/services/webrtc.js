import { io } from 'socket.io-client';

// In production on Vercel, the backend is proxied under /_/backend
const isProduction = import.meta.env.PROD;
const isVercel = window.location.hostname.includes('vercel.app');

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

// Only use the /_/backend prefix if we are connecting to the same origin as the frontend
const isSameOrigin = !import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL.includes(window.location.hostname);
const SOCKET_PATH = (isProduction && isVercel && isSameOrigin) ? '/_/backend/socket.io' : '/socket.io';

export class WebRTCService {
  constructor(roomId, isInitiator, callbacks) {
    this.roomId = roomId.toString();
    this.isInitiator = isInitiator;
    this.callbacks = callbacks;
    this.peerConnection = null;
    this.dataChannel = null;
    this.socket = null;
    this.fileChunks = [];
    this.receivingFileMeta = null;
  }

  connect() {
    this.socket = io(SOCKET_URL, {
      path: SOCKET_PATH
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Signaling] Connection error:', err.message);
    });

    this.socket.on('connect', () => {
      console.log('[Signaling] Connected to server, joining room:', this.roomId);
      this.socket.emit('join-room', this.roomId);
    });

    this.socket.on('user-joined', async (peerId) => {
      console.log('[Signaling] Peer joined:', peerId);
      // If we are the initiator (Sender), we create the offer when someone joins
      if (this.isInitiator) {
        this.targetPeerId = peerId;
        this.setupPeerConnection();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.socket.emit('webrtc-offer', { target: peerId, offer });
      }
    });

    this.socket.on('webrtc-offer', async ({ sender, offer }) => {
      console.log('[Signaling] Received offer from', sender);
      this.targetPeerId = sender;
      this.setupPeerConnection();
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit('webrtc-answer', { target: sender, answer });
    });

    this.socket.on('webrtc-answer', async ({ sender, answer }) => {
      console.log('[Signaling] Received answer from', sender);
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    this.socket.on('webrtc-ice-candidate', async ({ sender, candidate }) => {
      if (this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('[WebRTC] Error adding ICE candidate', e);
        }
      }
    });

    this.socket.on('user-left', () => {
      console.log('[Signaling] Peer left');
      if (this.callbacks.onPeerDisconnected) this.callbacks.onPeerDisconnected();
      this.disconnect();
    });
  }

  setupPeerConnection() {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    
    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          target: this.targetPeerId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'connected') {
        if (this.callbacks.onPeerConnected) this.callbacks.onPeerConnected();
      }
    };

    if (this.isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('file-transfer');
      this.setupDataChannel();
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }
  }

  setupDataChannel() {
    this.dataChannel.binaryType = 'arraybuffer';
    
    this.dataChannel.onopen = () => {
      console.log('[WebRTC] Data channel open');
    };

    this.dataChannel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);
        if (message.type === 'metadata') {
          this.receivingFileMeta = message;
          this.fileChunks = [];
          console.log('[WebRTC] Receiving file:', message.name, message.size);
          if (this.callbacks.onTransferStart) this.callbacks.onTransferStart(message);
        } else if (message.type === 'eof') {
          console.log('[WebRTC] End of file');
          const blob = new Blob(this.fileChunks);
          this.fileChunks = [];
          if (this.callbacks.onFileReceived) {
            this.callbacks.onFileReceived(this.receivingFileMeta, blob);
          }
        }
      } else {
        // Binary chunk
        this.fileChunks.push(event.data);
        if (this.callbacks.onProgress && this.receivingFileMeta) {
          const currentSize = this.fileChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
          this.callbacks.onProgress(currentSize / this.receivingFileMeta.size);
        }
      }
    };
  }

  async sendFile(file, onProgress) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel is not open');
    }

    // Send metadata
    this.dataChannel.send(JSON.stringify({
      type: 'metadata',
      name: file.name,
      size: file.size,
      mimeType: file.type
    }));

    // Send chunks
    const chunkSize = 16384; // 16KB chunks
    const buffer = await file.arrayBuffer();
    
    let offset = 0;
    while (offset < buffer.byteLength) {
      // Handle backpressure
      if (this.dataChannel.bufferedAmount > this.dataChannel.bufferedAmountLowThreshold) {
        await new Promise(resolve => {
          this.dataChannel.onbufferedamountlow = () => {
            this.dataChannel.onbufferedamountlow = null;
            resolve();
          };
        });
      }

      const chunk = buffer.slice(offset, offset + chunkSize);
      this.dataChannel.send(chunk);
      offset += chunk.byteLength;
      
      if (onProgress) {
        onProgress(offset / buffer.byteLength);
      }
    }

    // Send EOF
    this.dataChannel.send(JSON.stringify({ type: 'eof' }));
  }

  disconnect() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.peerConnection) this.peerConnection.close();
    if (this.socket) this.socket.disconnect();
  }
}
