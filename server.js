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
    socket.broadcast.emit("callEnded");
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

  // Handle answer to the call
  socket.on("answerCall", (data) => {
    console.log(`Answer received for call from ${data.to}`);
    io.to(data.to).emit("callAccepted", data.signal);
  });

  // Handle ICE candidate forwarding
  socket.on("sendIceCandidate", (data) => {
    console.log(`Forwarding ICE candidate from ${socket.id} to ${data.to}`);
    io.to(data.to).emit("receiveIceCandidate", { candidate: data.candidate });
  });

  // Handle call end
  socket.on("endCall", () => {
    console.log(`Call ended by ${socket.id}`);
    socket.broadcast.emit("callEnded");
  });
});

// Start the server
server.listen(5000, () => console.log("Server is running on port 5000"));
