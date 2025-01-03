const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Send the socket ID to the client
  socket.emit("me", socket.id);

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    const rooms = Array.from(socket.rooms);
    rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit("callEnded");
      }
    });
  });

  // Handle call initiation
  socket.on("callAllUsers", (data) => {
    console.log(`Broadcasting call from ${data.from} to all users`);
    socket.broadcast.emit("callAllUsers", {
      signalData: data.signalData,
      from: data.from,
      name: data.name,
    });
  });

  // Handle answer to the call and join a common room
  socket.on("answerCall", (data) => {
    const roomName = `room-${data.to}`;
    console.log(
      `Answer received for call from ${data.to}, creating/joining room: ${roomName}`
    );

    // Ensure both users join the same room
    socket.join(roomName);
    const callerSocket = io.sockets.sockets.get(data.to);
    if (callerSocket) {
      callerSocket.join(roomName);
      console.log(`Both users joined room: ${roomName}`);

      // Log all users in the room
      const roomUsers = Array.from(
        io.sockets.adapter.rooms.get(roomName) || []
      );
      console.log(`Users in room ${roomName}:`, roomUsers);

      // Notify the caller that the call is accepted
      io.to(roomName).emit("callAccepted", data.signal);

      // Emit room details to all clients
      io.emit("updateIncomingCalls", {
        answeredCallId: data.to,
        remainingCalls: roomUsers,
      });

      // Emit room details to the agent
      socket.emit("roomDetails", { roomName, users: roomUsers });
    } else {
      console.error(`Caller socket ${data.to} not found.`);
    }
  });

  // Handle ICE candidate forwarding within a room
  socket.on("sendIceCandidate", (data) => {
    const { to, candidate } = data;
    console.log(`Forwarding ICE candidate to: ${to}`);
    socket.to(to).emit("receiveIceCandidate", { candidate, from: socket.id });
  });

  // Handle call end
  socket.on("endCall", (data) => {
    const { room } = data;
    console.log(`Call ended by ${socket.id} in room: ${room}`);
    io.to(room).emit("callEnded");
    io.in(room).socketsLeave(room); // Remove all users from the room
  });
});

// Start the server
server.listen(5000, () => console.log("Server is running on port 5000"));
