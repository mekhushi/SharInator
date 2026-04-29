# SharInator Frontend

The SharInator frontend is a high-fidelity React application built with Vite, focused on delivering a low-latency, immersive file-sharing experience.

## Technical Highlights

### Audio Handshake Service
The `audioHandshake.js` service manages the generation and detection of ultrasonic frequencies.
- Frequency Range: 16kHz - 18kHz.
- FFT Size: 8192 for high-resolution frequency detection.
- Echo Cancellation: Disabled for pure frequency capture.

### WebRTC Service
The `webrtc.js` service handles the peer-to-peer lifecycle.
- ICE Servers: Configured for NAT traversal.
- Data Channel: `file-transfer` channel with `arraybuffer` binary type.
- Backpressure Management: Implements `onbufferedamountlow` to prevent memory overflow during large file transfers.

### 3D Component Architecture
The `Background3D.jsx` component provides a generative visual environment.
- Post-processing: Bloom and Chromatic Aberration effects for a premium "cyber" feel.
- Parallax: Integrated mouse/motion-based perspective shifts.

## Development

### Environment Variables
Ensure `VITE_BACKEND_URL` is set to your signaling server.

### Scripts
- `npm run dev`: Start the development server.
- `npm run build`: Generate production-ready assets.
- `npm run lint`: Run ESLint for code quality.

## Permissions
The application requires the following browser permissions:
- Microphone: For ultrasonic frequency detection.
- Motion (iOS): For "Shake-to-Share" functionality.

---

Built with React, Vite, and Three.js.
