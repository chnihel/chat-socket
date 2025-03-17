const socketIo = require("socket.io")
const jwt = require("jsonwebtoken")
const User = require("../models/amdin")

let io

// Initialize socket.io
const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token

      if (!token) {
        return next(new Error("Authentication error"))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.userId)

      if (!user) {
        return next(new Error("User not found"))
      }

      // Set user as online
      user.isOnline = true
      user.lastActive = Date.now()
      await user.save()

      // Attach user to socket
      socket.user = user
      next()
    } catch (error) {
      next(new Error("Authentication error"))
    }
  })

  // Connection handler
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username}`)

    // Join a room with the user's ID
    socket.join(socket.user._id.toString())

    // Broadcast to all clients that a user is online
    socket.broadcast.emit("user_online", {
      userId: socket.user._id,
      username: socket.user.username,
    })

    // Handle new messages
    socket.on("send_message", async (data) => {
      const { recipientId, content } = data

      // Emit to recipient if they are online
      io.to(recipientId).emit("new_message", {
        senderId: socket.user._id,
        senderName: socket.user.username,
        content,
        timestamp: new Date(),
      })
    })

    // Handle typing indicator
    socket.on("typing", (data) => {
      const { recipientId } = data

      io.to(recipientId).emit("user_typing", {
        userId: socket.user._id,
        username: socket.user.username,
      })
    })

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user.username}`)

      // Set user as offline
      const user = await User.findById(socket.user._id)
      if (user) {
        user.isOnline = false
        user.lastActive = Date.now()
        await user.save()

        // Broadcast to all clients that a user is offline
        io.emit("user_offline", {
          userId: socket.user._id,
        })
      }
    })
  })

  return io
}

// Get socket.io instance
const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized")
  }
  return io
}

module.exports = {
  initializeSocket,
  getIo,
}

