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

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

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
