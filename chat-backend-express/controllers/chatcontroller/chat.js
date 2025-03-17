const Message = require("../../models/chatmodel")
const User = require("../../models/amdin")
const { getIo } = require("../../utils/socketmanger")

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { recipient, content } = req.body

    if (!content.trim()) {
      return res.status(400).json({ message: "Message content cannot be empty" })
    }

    // Check if recipient exists
    const recipientUser = await User.findById(recipient)
    if (!recipientUser) {
      return res.status(404).json({ message: "Recipient not found" })
    }

    const message = new Message({
      sender: req.user._id,
      recipient,
      content,
    })

    await message.save()

    // If recipient is online and socket.io is initialized, emit a message event
    try {
      const io = getIo()
      if (recipientUser.isOnline) {
        io.to(recipient).emit("new_message", {
          message,
          sender: {
            _id: req.user._id,
            username: req.user.username,
          },
        })
      }
    } catch (socketError) {
      // Socket.io might not be initialized or other socket error
      // Just log it but continue - the message is saved in the database
      console.error("Socket error:", socketError)
    }

    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get messages between current user and another user
exports.getMessages = async (req, res) => {
  try {
    const userId = req.params.userId

    // Find messages where current user is either sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id },
      ],
    }).sort({ createdAt: 1 })

    // Mark messages as read if current user is the recipient
    await Message.updateMany({ sender: userId, recipient: req.user._id, read: false }, { read: true })

    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get unread message count for a specific user
exports.getUnreadCountFromUser = async (req, res) => {
  try {
    const userId = req.params.userId

    const count = await Message.countDocuments({
      sender: userId,
      recipient: req.user._id,
      read: false,
    })

    res.json({ count })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get total unread message count
exports.getTotalUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      read: false,
    })

    res.json({ count })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

