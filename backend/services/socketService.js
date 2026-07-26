// Shared socket state to avoid circular dependencies
let io = null;
let connectedUsers = {}; // { user_id: Set<socket_id> }
let userSockets = {}; // { socket_id: user_id }

const setIO = (socketIO) => {
  io = socketIO;
};

const getIO = () => io;

const getConnectedUsers = () => connectedUsers;

const setConnectedUsers = (users) => {
  connectedUsers = users;
};

const getUserSockets = () => userSockets;

const setUserSockets = (sockets) => {
  userSockets = sockets;
};

const addUserSocket = (userId, socketId) => {
  const key = String(userId);
  const wasOffline = !connectedUsers[key] || connectedUsers[key].size === 0;
  if (!connectedUsers[key]) {
    connectedUsers[key] = new Set();
  }
  connectedUsers[key].add(socketId);
  userSockets[socketId] = key;
  return wasOffline;
};

const removeUserSocket = (socketId) => {
  const userId = userSockets[socketId];
  if (!userId) return null;

  const sockets = connectedUsers[userId];
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      delete connectedUsers[userId];
    }
  }

  delete userSockets[socketId];
  return userId;
};

// Get socket ID for a specific user
const getUserSocket = (userId) => {
  const sockets = connectedUsers[String(userId)];
  if (!sockets || sockets.size === 0) return null;
  return sockets.values().next().value || null;
};

// Check if a user is online
const isUserOnline = (userId) => {
  const sockets = connectedUsers[String(userId)];
  return !!(sockets && sockets.size > 0);
};

module.exports = {
  setIO, getIO, getConnectedUsers, setConnectedUsers,
  getUserSockets, setUserSockets, addUserSocket, removeUserSocket,
  getUserSocket, isUserOnline
};
