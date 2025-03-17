const express = require("express")
const router = express.Router()
const messageController = require("../controllers/chatcontroller/chat")
const auth = require("../midlleware/Adminmidlleware")
const Message=require("../models/chatmodel")
*
router.post("/", messageController.sendMessage)

router.get("/:userId", messageController.getMessages)

router.get("/:userId/unread", messageController.getUnreadCountFromUser)

router.get("/unread/total", messageController.getTotalUnreadCount)




module.exports = router

