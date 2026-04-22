let waitingUsers = [];

const handleMatchmaking = (io, socket, rooms) => {
  // Check if there's someone waiting
  if (waitingUsers.length > 0) {
    const partner = waitingUsers.shift();
    
    if (!partner.connected) {
      handleMatchmaking(io, socket, rooms);
      return;
    }

    const roomId = `${socket.id}-${partner.id}`;

    socket.join(roomId);
    partner.join(roomId);

    socket.currentRoom = roomId;
    partner.currentRoom = roomId;

    // Store room state for rejoin support
    rooms.set(roomId, {
      users: new Set([socket.userId, partner.userId]),
      sockets: new Map([
        [socket.userId, socket.id],
        [partner.userId, partner.id]
      ])
    });

    io.to(roomId).emit("matched", { roomId });
    console.log(`Matched ${socket.id} with ${partner.id} in room ${roomId}`);
  } else {
    waitingUsers.push(socket);
    socket.emit("waiting", { message: "Waiting for a partner..." });
  }
};

const removeFromQueue = (socketId) => {
  waitingUsers = waitingUsers.filter(u => u.id !== socketId);
};

module.exports = { handleMatchmaking, removeFromQueue };
