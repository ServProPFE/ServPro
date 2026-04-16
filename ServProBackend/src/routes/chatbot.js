const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getChatbotResponse,
  getChatbotSuggestions,
  analyzeChatbotInput,
  checkAIHealth
} = require("../controllers/chatbotController");

const router = express.Router();

// Chatbot endpoints
router.post("/", authenticate, getChatbotResponse);
router.get("/suggestions", getChatbotSuggestions);
router.post("/analyze", authenticate, analyzeChatbotInput);
router.get("/health", checkAIHealth);

module.exports = router;
