# SharInator Backend

The SharInator backend serves as the signaling hub for the peer-to-peer connection process.

## Role
This server does not store or process file data. Its sole purpose is to:
1. Facilitate discovery based on "Room IDs" (generated from audio frequencies).
2. Relay WebRTC signaling messages (Offer, Answer, ICE Candidates) between peers.
3. Manage real-time connection states using WebSockets.

## Technology Stack
- Node.js
- Socket.io: For low-latency signaling communication.
- Express: Basic server structure.

## Signaling Flow
1. Peer A joins a room based on an acoustic signature.
2. Peer B joins the same room.
3. The server notifies both peers of each other's presence.
4. Peers exchange WebRTC SDP and ICE candidates through the server.
5. Once connected via WebRTC, the server is no longer involved in the data transfer.

## Deployment
The backend can be deployed on any Node.js environment. It is designed to work as a proxy service when deployed alongside the frontend on platforms like Vercel.

---

Signal, connect, share.
