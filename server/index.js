const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { handleMatchmaking, removeFromQueue } = require("./socket/matchmaking");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 5000,
  pingInterval: 10000
});

const activeUsers = new Set();
const rooms = new Map(); // Store room state: roomId -> { users: Set(userIds), sockets: Map(userId -> socketId) }
const disconnectTimeouts = new Map(); // roomId -> timeoutId

const updateUserCount = () => {
  io.emit("user_count", activeUsers.size);
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  activeUsers.add(socket.id);
  updateUserCount();

  // Handle Rejoin (Refresh Protection)
  socket.on("rejoin_chat", (data) => {
    const { userId, roomId } = data;
    const room = rooms.get(roomId);

    if (room && room.users.has(userId)) {
      // User is returning to their room
      socket.join(roomId);
      socket.currentRoom = roomId;
      socket.userId = userId;
      room.sockets.set(userId, socket.id);

      // Cancel any pending disconnect notification
      if (disconnectTimeouts.has(roomId)) {
        clearTimeout(disconnectTimeouts.get(roomId));
        disconnectTimeouts.delete(roomId);
      }

      socket.emit("rejoined", { roomId });
      socket.to(roomId).emit("partner_rejoined");
      console.log(`User ${userId} rejoined room ${roomId}`);
    } else {
      socket.emit("rejoin_failed");
    }
  });

  socket.on("find_partner", (data) => {
    const { userId } = data;
    socket.userId = userId;
    handleMatchmaking(io, socket, rooms);
  });

  socket.on("send_message", (data) => {
    const { message, roomId } = data;
    socket.to(roomId).emit("receive_message", {
      message,
      senderId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("typing", (data) => {
    const { roomId, isTyping } = data;
    socket.to(roomId).emit("typing", { isTyping });
  });

  socket.on("leave_chat", () => {
    handleUserLeaving(socket);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    activeUsers.delete(socket.id);
    updateUserCount();
    
    if (socket.currentRoom) {
      const roomId = socket.currentRoom;
      // Start a grace period before notifying partner
      const timeoutId = setTimeout(() => {
        socket.to(roomId).emit("partner_disconnected");
        rooms.delete(roomId);
        disconnectTimeouts.delete(roomId);
      }, 15000); // 15 seconds grace period
      
      disconnectTimeouts.set(roomId, timeoutId);
    }
    
    removeFromQueue(socket.id);
  });
});

const handleUserLeaving = (socket) => {
  if (socket.currentRoom) {
    const roomId = socket.currentRoom;
    socket.to(roomId).emit("partner_disconnected");
    socket.leave(roomId);
    rooms.delete(roomId);
    socket.currentRoom = null;
  }
  removeFromQueue(socket.id);
};

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
