const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listNotifications,
  readNotification,
  readAllNotifications,
} = require("../controllers/notificationsController");

const router = express.Router();

router.get("/", authenticate, listNotifications);
router.patch("/read-all", authenticate, readAllNotifications);
router.patch("/:id/read", authenticate, readNotification);

module.exports = router;