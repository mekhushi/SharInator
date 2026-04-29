# SharInator

SharInator is a high-performance, proximity-aware file sharing platform that leverages ultrasonic audio handshakes and WebRTC for seamless, secure, and instantaneous peer-to-peer data transfer. By eliminating the need for QR codes, links, or manual configuration, SharInator redefines the proximity-sharing experience with a focus on speed and privacy.

## Core Features

### Ultrasonic Discovery
SharInator utilizes the Web Audio API to broadcast and detect high-frequency acoustic signatures (16kHz - 18kHz). This enables devices in the same physical space to discover each other automatically without any user intervention. It transforms sound into a digital handshake, making device pairing as natural as a conversation.

### Direct Peer-to-Peer Transfer
Leveraging WebRTC Data Channels, files are transmitted directly between devices. This architecture ensures that data never touches a central server, providing maximum privacy and utilizing the full available bandwidth of the local network.

### Shake-to-Share Integration
Beyond discovery, SharInator supports gesture-based interaction. Using device motion sensors, users can initiate sharing sessions or confirm transfers with a simple shake, adding a tactile dimension to digital data exchange.

### Radar Interface and 3D Visuals
The application features a sophisticated radar-inspired discovery interface set against a generative 3D background. Powered by React Three Fiber, the UI provides real-time visual feedback during the pairing process, representing nearby peers as active signals on a high-fidelity scanning display.

### Security and Privacy
The signaling server is used exclusively for the initial discovery and ICE candidate exchange. Once a WebRTC connection is established, all communication is end-to-end encrypted and transmitted directly between peers.

## Technical Architecture

### Frontend
- React and Vite: For a lightning-fast, modern development experience and optimized production builds.
- Web Audio API: Used for frequency-shift keying (FSK) and real-time spectrum analysis for the audio handshake.
- WebRTC API: Manages the peer-to-peer connection, NAT traversal via STUN servers, and high-speed binary data transfer.
- Three.js / React Three Fiber: Powers the immersive, premium visual experience with animated blobs and sound-responsive particle systems.
- Framer Motion: Ensures fluid transitions and micro-animations across the interface.

### Backend
- Node.js and Socket.io: Serves as the signaling gateway, orchestrating the initial handshake between peers based on their acoustic room signatures.

## Installation and Deployment

### Prerequisites
- Node.js (Version 16 or higher)
- NPM or Yarn

### Local Setup

1. Clone the repository:
   git clone https://github.com/mekhushi/SharInator.git

2. Install dependencies for both backend and frontend:
   cd backend && npm install
   cd ../frontend && npm install

3. Configure environment variables:
   Create a .env file in the frontend directory and specify your backend URL.
   VITE_BACKEND_URL=http://localhost:3000

4. Start the development servers:
   In the backend directory: npm run dev
   In the frontend directory: npm run dev

### Deployment
The project is optimized for deployment on Vercel or similar platforms. The frontend can be served as a static site, while the backend requires a Node.js environment capable of supporting WebSockets for signaling.

## Usage Guide

1. Open SharInator on two or more devices within the same room.
2. Grant microphone and motion permissions when prompted.
3. Wait for the radar to detect the neighboring device via the ultrasonic handshake.
4. Once paired, select a file and initiate the transfer.
5. The receiving device will automatically prompt for the download once the transfer is complete.

## Performance Considerations
SharInator uses 16KB chunk sizes for WebRTC data transfer, optimized for stability and speed across various network conditions. The audio handshake is designed with stability thresholds and wide match windows to accommodate varying microphone qualities and environmental noise.

---

Developed with a focus on technical excellence, privacy, and immersive design.
