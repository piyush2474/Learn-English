const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: { 
    type: String, 
    required: true,
    index: true
  },
  senderId: { 
    type: String, 
    required: true 
  },
  messageId: {
    type: String,
    required: true,
    index: true
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
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: { expires: '24h' } // Automatically delete messages after 24 hours
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
