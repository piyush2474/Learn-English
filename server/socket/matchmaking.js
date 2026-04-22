let waitingUsers = [];

const handleMatchmaking = (io, socket) => {
  // Check if there's someone waiting
  if (waitingUsers.length > 0) {
    // Get the first user from the queue
    const partner = waitingUsers.shift();
    
    // Safety check: ensure partner is still connected
    if (!partner.connected) {
      handleMatchmaking(io, socket);
      return;
    }

    const roomId = `${socket.id}-${partner.id}`;

    // Both users join the room
    socket.join(roomId);
    partner.join(roomId);

    // Store room info on socket for easy cleanup
    socket.currentRoom = roomId;
    partner.currentRoom = roomId;
    socket.partnerId = partner.id;
    partner.partnerId = socket.id;

    // Notify both users they are matched
    io.to(roomId).emit("matched", { roomId });
    console.log(`Matched ${socket.id} with ${partner.id} in room ${roomId}`);
  } else {
    // No one waiting, add current user to queue
    waitingUsers.push(socket);
    socket.emit("waiting", { message: "Waiting for a partner..." });
    console.log(`User ${socket.id} added to waiting queue`);
  }
};

const removeFromQueue = (socketId) => {
  waitingUsers = waitingUsers.filter(u => u.id !== socketId);
};

module.exports = { handleMatchmaking, removeFromQueue };
