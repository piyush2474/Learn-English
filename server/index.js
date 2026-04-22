const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const { handleMatchmaking, removeFromQueue } = require("./socket/matchmaking");
const nodemailer = require("nodemailer");
require("dotenv").config();

// --- Email Configuration ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// --------------------------

const app = express();
app.use(cors());

// --- Database Connection ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/learn_english_chat";
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));
// --------------------------

const activeUsers = new Set();
const onlineUsers = new Map(); // userId -> socketId mapping

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 5000,
  pingInterval: 10000
});

const rooms = new Map(); // Store room state: roomId -> { users: Set(userIds), sockets: Map(userId -> socketId) }
const disconnectTimeouts = new Map(); // roomId -> timeoutId

const updateUserCount = () => {
  io.emit("user_count", activeUsers.size);
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  activeUsers.add(socket.id);
  updateUserCount();

  // --- Friend System Listeners ---
  socket.on("register_user", async (data) => {
    const { userId } = data;
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId });
      await user.save();
    }
    
    // Fetch friends and their online status
    const friendData = await User.find({ userId: { $in: user.friends } });
    const friendsList = friendData.map(f => ({
      userId: f.userId,
      name: f.name || "Stranger",
      isOnline: onlineUsers.has(f.userId)
    }));

    socket.emit("init_data", { 
      name: user.name || "Stranger",
      friends: friendsList,
      pendingRequests: user.pendingRequests 
    });

    // Notify friends that this user is now online
    user.friends.forEach(fId => {
      const fSocket = onlineUsers.get(fId);
      if (fSocket) {
        io.to(fSocket).emit("friend_status_update", { userId, isOnline: true });
      }
    });
  });

  socket.on("update_profile", async (data) => {
    const { name } = data;
    if (socket.userId) {
      await User.findOneAndUpdate({ userId: socket.userId }, { name });
      socket.emit("profile_updated", { name });
    }
  });

  socket.on("send_friend_request", async (data) => {
    const { roomId } = data;
    if (!rooms.has(roomId)) return;
    const partnerId = [...rooms.get(roomId).users].find(id => id !== socket.userId);
    
    if (partnerId) {
      const me = await User.findOne({ userId: socket.userId });
      await User.findOneAndUpdate(
        { userId: partnerId },
        { $addToSet: { pendingRequests: { from: socket.userId, fromName: me.name || "Stranger" } } }
      );
      
      const partnerSocketId = rooms.get(roomId).sockets.get(partnerId);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit("incoming_friend_request", { from: socket.userId, fromName: me.name || "Stranger" });
      }
    }
  });

  socket.on("accept_friend_request", async (data) => {
    const { fromUserId } = data;
    if (!socket.userId) return;

    await User.findOneAndUpdate({ userId: socket.userId }, { 
      $addToSet: { friends: fromUserId },
      $pull: { pendingRequests: { from: fromUserId } }
    });
    await User.findOneAndUpdate({ userId: fromUserId }, { 
      $addToSet: { friends: socket.userId } 
    });
    
    const isOtherOnline = onlineUsers.has(fromUserId);
    const me = await User.findOne({ userId: socket.userId });
    const other = await User.findOne({ userId: fromUserId });

    socket.emit("friend_added", { 
      userId: fromUserId, 
      name: other.name || "Stranger", 
      isOnline: isOtherOnline 
    });
    
    const otherUserSocket = onlineUsers.get(fromUserId);
    if (otherUserSocket) {
      io.to(otherUserSocket).emit("friend_added", { 
        userId: socket.userId, 
        name: me.name || "Stranger", 
        isOnline: true 
      });
    }
  });
  socket.on("remove_friend", async (data) => {
    const { friendId } = data;
    if (!socket.userId || !friendId) return;

    await User.findOneAndUpdate({ userId: socket.userId }, { $pull: { friends: friendId } });
    await User.findOneAndUpdate({ userId: friendId }, { $pull: { friends: socket.userId } });

    socket.emit("friend_removed", { userId: friendId });
    const friendSocket = onlineUsers.get(friendId);
    if (friendSocket) {
      io.to(friendSocket).emit("friend_removed", { userId: socket.userId });
    }
  });
  // ------------------------------

  socket.on("inform_owner", async (data) => {
    const { message, senderName } = data;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.OWNER_EMAIL,
      subject: `New Information/Feedback from ${senderName || 'Anonymous'}`,
      text: `You have received a new message from ${senderName || 'a user'}:\n\n${message}`
    };

    try {
      await transporter.sendMail(mailOptions);
      socket.emit("inform_sent", { success: true });
    } catch (error) {
      console.error("Email error:", error);
      socket.emit("inform_sent", { success: false, error: "Failed to send email" });
    }
  });

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
    const { roomId } = data;
    // Relay the entire data object (includes message, type, messageId, etc.)
    socket.to(roomId).emit("receive_message", data);
  });

  socket.on("start_private_chat", async (data) => {
    const { friendId } = data;
    if (!socket.userId || !friendId) return;

    const partnerSocketId = onlineUsers.get(friendId);
    if (!partnerSocketId) {
      socket.emit("error", { message: "Friend is offline" });
      return;
    }

    const roomId = `private_${[socket.userId, friendId].sort().join("_")}`;
    
    socket.join(roomId);
    const partnerSocket = io.sockets.sockets.get(partnerSocketId);
    if (partnerSocket) {
      partnerSocket.join(roomId);
    }

    rooms.set(roomId, {
      users: new Set([socket.userId, friendId]),
      sockets: new Map([
        [socket.userId, socket.id],
        [friendId, partnerSocketId]
      ])
    });

    io.to(roomId).emit("matched", { roomId, isPrivate: true });
  });


  socket.on("delete_message", (data) => {
    const { roomId, messageId } = data;
    socket.to(roomId).emit("message_deleted", { messageId });
  });

  socket.on("exchange_keys", (data) => {
    const { roomId, publicKey } = data;
    socket.to(roomId).emit("exchange_keys", { publicKey });
  });


  socket.on("typing", (data) => {
    const { roomId, isTyping } = data;
    socket.to(roomId).emit("typing", { isTyping });
  });

  // --- WebRTC Signaling for Calls ---
  socket.on("call_user", (data) => {
    const { roomId, signalData, type } = data;
    socket.to(roomId).emit("incoming_call", { signal: signalData, type });
  });

  socket.on("answer_call", (data) => {
    const { roomId, signalData } = data;
    socket.to(roomId).emit("call_accepted", signalData);
  });

  socket.on("end_call", (data) => {
    const { roomId } = data;
    socket.to(roomId).emit("call_ended");
  });

  socket.on("ice_candidate", (data) => {
    const { roomId, candidate } = data;
    socket.to(roomId).emit("ice_candidate", candidate);
  });
  // ----------------------------------

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
