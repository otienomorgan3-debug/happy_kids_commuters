// Shared socket state to avoid circular dependencies
let io = null;
let connectedUsers = {};

const setIO = (socketIO) => {
  io = socketIO;
};

const getIO = () => io;

const getConnectedUsers = () => connectedUsers;

const setConnectedUsers = (users) => {
  connectedUsers = users;
};

module.exports = { setIO, getIO, getConnectedUsers, setConnectedUsers };