const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  friends: [{ 
    type: String // List of friend userIds
  }],
  pendingRequests: [{
    from: String,
    timestamp: { type: Date, default: Date.now }
  }],
  lastActive: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
