const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();

// Update CORS for production
const allowedOrigins = [
  'http://localhost:5173',
  'https://share-inator.vercel.app', // Update with actual Vercel URL
  /\.vercel\.app$/
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
  path: '/_/backend/socket.io', // Explicitly match the Vercel routePrefix
  cors: {
    origin: allowedOrigins,
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
    socket.join(roomId);
    
    // Initialize room if not exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    const room = rooms.get(roomId);
    room.add(socket.id);
    
    console.log(`User ${socket.id} joined room ${roomId}. Users in room: ${room.size}`);

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
