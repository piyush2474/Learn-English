const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/learn_english_chat";

const reset = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
    
    const result = await User.updateMany({}, { 
      isVaultEnabled: false, 
      vaultPassword: null 
    });
    
    console.log(`Reset vault for ${result.modifiedCount} users.`);
    process.exit(0);
  } catch (err) {
    console.error("Error resetting vault:", err);
    process.exit(1);
  }
};

reset();
