const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Update CORS for production and development
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://share-inator.vercel.app',
  /\.vercel\.app$/,
  /^http:\/\/192\.168\.\d+\.\d+:5173$/, // Allow local network IPs
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:5173$/, // Allow other local ranges
  /^http:\/\/10\.\d+\.\d+\.\d+:5173$/
];

app.use(cors({
  origin: (origin, callback) => {
    // In development, allow all origins if it's from a local network or localhost
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for socket.io in development
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Stores information about rooms and connected clients
const rooms = new Map();
const activeShakers = new Map(); // socketId -> timestamp

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Shake-to-Sync logic
  socket.on('shake-sync', () => {
    const now = Date.now();
    console.log(`[Shake] User ${socket.id} is shaking`);

    // Find if anyone else is shaking within 2 seconds
    let matchId = null;
    for (const [id, time] of activeShakers.entries()) {
      if (id !== socket.id && Math.abs(now - time) < 2000) {
        matchId = id;
        break;
      }
    }

    if (matchId) {
      // Match found!
      const roomId = `shake-${Math.floor(Math.random() * 9000) + 1000}`;
      console.log(`[Shake] Match found! ${socket.id} <-> ${matchId} in room ${roomId}`);
      
      // Notify both peers
      io.to(socket.id).emit('shake-matched', { roomId, role: 'sender' });
      io.to(matchId).emit('shake-matched', { roomId, role: 'receiver' });
      
      // Clean up
      activeShakers.delete(matchId);
    } else {
      // Add to queue
      activeShakers.set(socket.id, now);
      
      // Remove after 3 seconds if no match
      setTimeout(() => {
        if (activeShakers.get(socket.id) === now) {
          activeShakers.delete(socket.id);
          socket.emit('shake-timeout');
        }
      }, 3000);
    }
  });

  // User joins a room based on the frequency detected
  socket.on('join-room', (roomId) => {
    if (!roomId) {
      console.warn(`[Signaling] User ${socket.id} tried to join with empty roomId`);
      return;
    }

    socket.join(roomId);
    
    // Initialize room if not exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    const room = rooms.get(roomId);
    room.add(socket.id);
    
    console.log(`[Signaling] User ${socket.id} joined room ${roomId}. Total users in room: ${room.size}`);

    // Notify other peers in the room
    socket.to(roomId).emit('user-joined', socket.id);
  });

  // Relay WebRTC Offer
  socket.on('webrtc-offer', ({ target, offer }) => {
    socket.to(target).emit('webrtc-offer', {
      sender: socket.id,
      offer
    });
  });

  // Relay WebRTC Answer
  socket.on('webrtc-answer', ({ target, answer }) => {
    socket.to(target).emit('webrtc-answer', {
      sender: socket.id,
      answer
    });
  });

  // Relay ICE Candidates
  socket.on('webrtc-ice-candidate', ({ target, candidate }) => {
    socket.to(target).emit('webrtc-ice-candidate', {
      sender: socket.id,
      candidate
    });
  });

  // Disconnection logic
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    activeShakers.delete(socket.id);
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit('user-left', socket.id);
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`[Share-Inator Backend] Server running on port ${PORT}`);
});
