import { io } from "socket.io-client";

// Use environment variable for production, fallback to localhost for development
const URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export const socket = io(URL, {
  autoConnect: false
});
