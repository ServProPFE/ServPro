const { asyncHandler } = require("../utils/asyncHandler");
const {
  listNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../services/notificationService");

const listNotifications = asyncHandler(async (req, res) => {
  const scope = req.query.scope === "all" ? "all" : "mine";
  const unreadOnly = req.query.unread === "true";
  const result = await listNotificationsForUser({
    userId: req.user.id,
    userType: req.user.type,
    unreadOnly,
    scope,
  });

  res.json(result);
});

const readNotification = asyncHandler(async (req, res) => {
  const notification = await markNotificationAsRead({
    notificationId: req.params.id,
    userId: req.user.id,
    userType: req.user.type,
  });

  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  res.json(notification);
});

const readAllNotifications = asyncHandler(async (req, res) => {
  const modifiedCount = await markAllNotificationsAsRead({
    userId: req.user.id,
    userType: req.user.type,
  });

  res.json({ message: "Notifications marked as read", modifiedCount });
});

module.exports = { listNotifications, readNotification, readAllNotifications };