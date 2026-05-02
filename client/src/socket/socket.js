import { io } from "socket.io-client";

// Use environment variable for production, fallback to localhost for development
const URL = import.meta.env.VITE_BACKEND_URL || "https://learn-english-backend.onrender.com";

export const socket = io(URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnectionAttempts: 8,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000
});
