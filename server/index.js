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
    origin: "*", // Allow all origins for free hosting flexibility
    methods: ["GET", "POST"]
  },
  pingTimeout: 5000,
  pingInterval: 10000
});

const activeUsers = new Set();

const updateUserCount = () => {
  io.emit("user_count", activeUsers.size);
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  activeUsers.add(socket.id);
  updateUserCount();

  // Handle Matchmaking request
  socket.on("find_partner", () => {
    handleMatchmaking(io, socket);
  });

  // Handle Messages
  socket.on("send_message", (data) => {
    const { message, roomId } = data;
    socket.to(roomId).emit("receive_message", {
      message,
      senderId: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Handle Typing Indicator
  socket.on("typing", (data) => {
    const { roomId, isTyping } = data;
    socket.to(roomId).emit("typing", { isTyping });
  });

  // Handle "Next" or Manual Disconnect from Partner
  socket.on("leave_chat", () => {
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit("partner_disconnected");
      socket.leave(socket.currentRoom);
      socket.currentRoom = null;
      socket.partnerId = null;
    }
    removeFromQueue(socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit("partner_disconnected");
    }
    removeFromQueue(socket.id);
    activeUsers.delete(socket.id);
    updateUserCount();
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
