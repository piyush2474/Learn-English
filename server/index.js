const express = require("express");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Message = require("./models/Message");
const { handleMatchmaking, removeFromQueue } = require("./socket/matchmaking");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
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

// --- Telegram Notification Helper ---
const sendTelegramMessage = (text) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(url, options, (res) => {
    res.on('data', () => {}); 
  });

  req.on('error', (e) => console.error("Telegram error:", e));
  req.write(data);
  req.end();
};

const app = express();
app.use(cors());

// --- Database Connection ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/learn_english_chat";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    console.log("Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected! Retrying...');
  connectDB();
});

connectDB();
// --------------------------

const activeUsers = new Set();
const onlineUsers = new Map(); // userId -> { socketId, status: 'available' | 'busy', roomId }

const broadcastStatusUpdate = async (userId, isOnline, socketOrIo) => {
  try {
    const user = await User.findOne({ userId });
    if (user && user.friends && user.friends.length > 0) {
      const liveInfo = onlineUsers.get(userId);
      const activity = isOnline ? (liveInfo?.status || 'available') : 'offline';
      const lastActive = isOnline ? new Date() : user.lastActive;
      const roomId = isOnline ? liveInfo?.roomId : null;

      // Manually find all friends who are currently online
      user.friends.forEach(friendId => {
        const friendEntry = onlineUsers.get(friendId);
        if (friendEntry && friendEntry.socketId) {
          socketOrIo.to(friendEntry.socketId).emit('friend_status_update', {
            userId,
            isOnline,
            activity,
            roomId,
            lastActive
          });
        }
      });
    }
  } catch (e) {
    console.error("Status broadcast error:", e);
  }
};

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e7 // 10MB
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
    
    // Store live activity info
    onlineUsers.set(userId, { socketId: socket.id, status: 'available', roomId: null });
    
    // Ensure user exists in DB and update online status
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ 
        userId, 
        isOnline: true, 
        name: 'Stranger',
        avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
      });
      await user.save();
    } else {
      user.isOnline = true;
      await user.save();
    }

    broadcastStatusUpdate(userId, true, socket);
    console.log(`User registered: ${userId}`);

    // Initial data fetch: Manually fetch friends because they are strings, not ObjectIds
    const freshUser = await User.findOne({ userId });
    if (freshUser) {
      const friendsList = await User.find({ userId: { $in: freshUser.friends } });
      const friendsData = friendsList.map(f => {
        const liveInfo = onlineUsers.get(f.userId);
        return {
          userId: f.userId,
          name: f.name || "Stranger",
          isOnline: !!liveInfo,
          activity: liveInfo ? liveInfo.status : 'offline',
          roomId: liveInfo ? liveInfo.roomId : null,
          lastActive: f.lastActive,
          avatarColor: f.avatarColor
        };
      });

      socket.emit("init_data", { 
        name: freshUser.name || "Stranger",
        friends: friendsData,
        pendingRequests: freshUser.pendingRequests,
        isVaultEnabled: freshUser.isVaultEnabled || false
      });
    }
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
    
    const otherUserEntry = onlineUsers.get(fromUserId);
    if (otherUserEntry) {
      io.to(otherUserEntry.socketId).emit("friend_added", { 
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
    const friendEntry = onlineUsers.get(friendId);
    if (friendEntry) {
      io.to(friendEntry.socketId).emit("friend_removed", { userId: socket.userId });
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
      // Send Email
      await transporter.sendMail(mailOptions);
      
      // Send Telegram Notification
      const telegramText = `📩 *New Feedback/Inform*\n\n*From:* ${senderName || 'Anonymous'}\n*Message:* ${message}`;
      sendTelegramMessage(telegramText);

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
      onlineUsers.set(userId, { socketId: socket.id, status: 'busy', roomId });
      broadcastStatusUpdate(userId, true, socket);

      // Cancel any pending disconnect notification
      if (disconnectTimeouts.has(roomId)) {
        clearTimeout(disconnectTimeouts.get(roomId));
        disconnectTimeouts.delete(roomId);
      }

      const partnerUserId = [...room.users].find(id => id !== userId);
      
      // Re-sync partner's status as well if they are online
      const partnerEntry = onlineUsers.get(partnerUserId);
      if (partnerEntry) {
        onlineUsers.set(partnerUserId, { ...partnerEntry, status: 'busy', roomId });
        broadcastStatusUpdate(partnerUserId, true, socket);
      }

      socket.emit("rejoined", { roomId, partnerUserId });
      socket.to(roomId).emit("partner_rejoined");
      console.log(`User ${userId} rejoined room ${roomId}`);

      // Fetch and send chat history for private rooms
      if (roomId.startsWith('private_')) {
        Message.find({ roomId }).sort({ timestamp: 1 }).limit(100).then(history => {
          socket.emit("chat_history", history);
        });
      }
    } else {
      socket.emit("rejoin_failed");
    }
  });

  socket.on("find_partner", (data) => {
    const { userId } = data;
    socket.userId = userId;
    handleMatchmaking(io, socket, rooms);
  });

  socket.on("send_message", async (data) => {
    const { roomId, message, type, messageId, senderId } = data;
    
    // Relay message instantly
    socket.to(roomId).emit("receive_message", data);

    // Persist if it's a private room (friends)
    if (roomId.startsWith('private_')) {
      try {
        await new Message({
          roomId,
          senderId,
          message,
          type: type || 'text',
          status: 'sent',
          timestamp: new Date()
        }).save();
      } catch (e) {
        console.error("Failed to save message:", e);
      }
    }
  });

  socket.on("clear_chat", async (data) => {
    const { roomId } = data;
    if (roomId.startsWith('private_')) {
      await Message.deleteMany({ roomId });
      io.to(roomId).emit("chat_cleared", { roomId });
    }
  });

  socket.on("mark_messages_seen", async (data) => {
    const { roomId, userId } = data;
    if (roomId.startsWith('private_')) {
      await Message.updateMany(
        { roomId, senderId: { $ne: userId }, status: 'sent' },
        { status: 'seen' }
      );
      socket.to(roomId).emit("messages_marked_seen", { roomId });
    }
  });

  socket.on("start_private_chat", async (data) => {
    const { friendId } = data;
    if (!socket.userId || !friendId) return;

    const roomId = `private_${[socket.userId, friendId].sort().join("_")}`;
    const partnerEntry = onlineUsers.get(friendId);
    
    socket.join(roomId);
    
    // Initialize room state if not exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Set([socket.userId, friendId]),
        sockets: new Map()
      });
    }

    const room = rooms.get(roomId);
    room.sockets.set(socket.userId, socket.id);
    onlineUsers.set(socket.userId, { socketId: socket.id, status: 'busy', roomId });
    broadcastStatusUpdate(socket.userId, true, socket);

    // If partner is online, bring them into the room
    if (partnerEntry) {
      const partnerSocket = io.sockets.sockets.get(partnerEntry.socketId);
      if (partnerSocket) {
        partnerSocket.join(roomId);
        room.sockets.set(friendId, partnerEntry.socketId);
        onlineUsers.set(friendId, { ...partnerEntry, status: 'busy', roomId });
        broadcastStatusUpdate(friendId, true, socket);
      }
    }

    socket.emit("matched", { roomId, isPrivate: true, partnerUserId: friendId });

    Message.find({ roomId }).sort({ timestamp: 1 }).limit(100).then(history => {
      socket.emit("chat_history", history);
    });
  });

  // --- Vault Handlers ---
  socket.on("set_vault_password", async (data) => {
    const { password } = data;
    if (!socket.userId || !password) return;

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate(
      { userId: socket.userId },
      { vaultPassword: hashedPassword, isVaultEnabled: true }
    );
    socket.emit("vault_status", { isVaultEnabled: true, message: "Vault enabled successfully" });
  });

  socket.on("verify_vault_password", async (data) => {
    const { password } = data;
    if (!socket.userId || !password) return;

    const user = await User.findOne({ userId: socket.userId });
    if (!user || !user.vaultPassword) {
      socket.emit("vault_verify_result", { success: false, error: "Vault not setup" });
      return;
    }

    const match = await bcrypt.compare(password, user.vaultPassword);
    socket.emit("vault_verify_result", { success: match });
  });

  socket.on("change_vault_password", async (data) => {
    const { oldPassword, newPassword } = data;
    if (!socket.userId || !oldPassword || !newPassword) return;

    const user = await User.findOne({ userId: socket.userId });
    if (!user || !user.vaultPassword) {
      socket.emit("vault_status", { success: false, error: "Vault not setup" });
      return;
    }

    const match = await bcrypt.compare(oldPassword, user.vaultPassword);
    if (!match) {
      socket.emit("vault_status", { success: false, error: "Incorrect old password" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      { userId: socket.userId },
      { vaultPassword: hashedPassword }
    );
    socket.emit("vault_status", { success: true, message: "Password changed successfully" });
  });

  socket.on("toggle_vault", async (data) => {
    const { enabled, password } = data;
    if (!socket.userId) return;

    const user = await User.findOne({ userId: socket.userId });
    if (!user) return;

    // Must verify password to toggle off
    if (!enabled && user.vaultPassword) {
      const match = await bcrypt.compare(password, user.vaultPassword);
      if (!match) {
        socket.emit("vault_status", { success: false, error: "Incorrect password" });
        return;
      }
    }

    await User.findOneAndUpdate({ userId: socket.userId }, { isVaultEnabled: enabled });
    socket.emit("vault_status", { success: true, isVaultEnabled: enabled });
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

  socket.on("matched", (data) => {
    const { roomId, userId1, userId2 } = data;
    
    const info1 = onlineUsers.get(userId1);
    if (info1) onlineUsers.set(userId1, { ...info1, status: 'busy', roomId });
    
    const info2 = onlineUsers.get(userId2);
    if (info2) onlineUsers.set(userId2, { ...info2, status: 'busy', roomId });

    broadcastStatusUpdate(userId1, true, io);
    broadcastStatusUpdate(userId2, true, io);

    io.to(roomId).emit("matched", { roomId });
  });

  socket.on("ice_candidate", (data) => {
    const { roomId, candidate } = data;
    socket.to(roomId).emit("ice_candidate", candidate);
  });
  // ----------------------------------

  const handleLeave = async () => {
    const userEntry = [...onlineUsers.entries()].find(([_, info]) => info.socketId === socket.id);
    if (userEntry) {
      const userId = userEntry[0];
      const info = onlineUsers.get(userId);
      const roomId = info?.roomId;

      if (roomId) {
        socket.leave(roomId);
        socket.to(roomId).emit("partner_disconnected");
        
        // Set user to available
        onlineUsers.set(userId, { ...info, status: 'available', roomId: null });
        broadcastStatusUpdate(userId, true, socket);

        // Also set partner to available if they are online
        const partnerEntry = [...onlineUsers.entries()].find(([_, pInfo]) => pInfo.roomId === roomId && pInfo.socketId !== socket.id);
        if (partnerEntry) {
          const pUserId = partnerEntry[0];
          const pInfo = onlineUsers.get(pUserId);
          onlineUsers.set(pUserId, { ...pInfo, status: 'available', roomId: null });
          broadcastStatusUpdate(pUserId, true, socket);
        }
      }
    }
  };

  socket.on("leave_chat", handleLeave);

  socket.on("uploading_media", (data) => {
    const { roomId, type } = data;
    socket.to(roomId).emit("partner_uploading_media", { type });
  });

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.id}`);
    activeUsers.delete(socket.id);
    updateUserCount();
    
    const userEntry = [...onlineUsers.entries()].find(([_, info]) => info.socketId === socket.id);
    if (userEntry) {
      const userId = userEntry[0];
      handleLeave(); // Ensure room status is updated
      
      onlineUsers.delete(userId);
      await User.findOneAndUpdate({ userId }, { isOnline: false, lastActive: new Date() });
      broadcastStatusUpdate(userId, false, socket);
      console.log(`User disconnected: ${userId}`);
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
