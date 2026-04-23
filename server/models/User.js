const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: {
    type: String,
    default: "Stranger"
  },
  friends: [{ 
    type: String // List of friend userIds
  }],
  pendingRequests: [{
    from: String,
    fromName: String,
    timestamp: { type: Date, default: Date.now }
  }],
  lastActive: { 
    type: Date, 
    default: Date.now 
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  avatarColor: {
    type: String,
    default: () => {
      const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];
      return colors[Math.floor(Math.random() * colors.length)];
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
