const express = require("express")
const router = express.Router()
const userController = require("../controllers/chatcontroller/userchat")
const auth = require("../midlleware/Adminmidlleware")



// Get all online users
router.get("/", userController.getUsers)

// Get current user
router.get("/me", userController.getCurrentUser)

// Get user by ID
router.get("/:userId", userController.getUserById)

// Update user's last active time
router.put("/active", userController.updateLastActive)

module.exports = router

