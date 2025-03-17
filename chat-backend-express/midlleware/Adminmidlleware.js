const jwt = require("jsonwebtoken")
const User = require("../models/amdin")

// Middleware to authenticate token
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token, authorization denied" })
    }

    const token = authHeader.split(" ")[1]

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Find user by id
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    // Set user as online
    if (!user.isOnline) {
      user.isOnline = true
      user.lastActive = Date.now()
      await user.save()
    }

    // Add user to request object
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" })
  }
}

module.exports = auth

