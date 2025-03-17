const User = require("../../models/amdin")

// Get all online users
// exports.getUsers = async (req, res) => {
//   try {
//     // Find all online users except the current userfl 
//     const users = await User.find({
//       isOnline: true,
//       _id: { $ne: req.user._id },
//     }).select("-password")

//     res.json(users)
//   } catch (error) {
//     res.status(500).json({ message: error.message })
//   }
// }

exports.getUsers = async (req, res) => {
    try {
      // Find all online users except the current userfl 
      const users = await User.find({
      })
  
      res.json(users)
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }
  
// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // Return user info without password
    const user = await User.findById(req.user._id).select("-password")
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Update user's last active time
exports.updateLastActive = async (req, res) => {
  try {
    req.user.lastActive = Date.now()
    await req.user.save()

    res.json({ message: "Last active time updated" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get all users (both online and offline)
exports.getAllUsers = async (req, res) => {
  try {
    // Find all users except the current user
    const users = await User.find({
      _id: { $ne: req.user._id },
    })
      .select("-password")
      .sort({ isOnline: -1, lastActive: -1 })

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

