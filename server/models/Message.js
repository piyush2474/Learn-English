const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { 
    type: String, 
    required: true
  },
  senderId: { 
    type: String, 
    required: true 
  },
  messageId: {
    type: String,
    default: () => Math.random().toString(36).substr(2, 9)
  },
  message: { 
    type: String, 
    required: true 
  },
  type: {
    type: String,
    enum: ['text', 'image'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'seen'],
    default: 'sent'
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  replyTo: {
    messageId: String,
    message: String,
    senderId: String,
    type: { type: String, default: 'text' }
  },
  reactions: [{
    emoji: String,
    userId: String
  }],
  timestamp: { 
    type: Date, 
    default: Date.now
  }
}, { timestamps: true });

// List + pagination hot path
messageSchema.index({ roomId: 1, timestamp: -1 });
// Idempotent upsert by client message id (sparse allows legacy docs without messageId)
messageSchema.index({ roomId: 1, messageId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Message', messageSchema);
