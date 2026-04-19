const { Booking } = require("../models/Booking");
const { Notification } = require("../models/Notification");
const { Service } = require("../models/Service");

const resolveServiceName = async (service) => {
  if (!service) {
    return "service";
  }

  if (typeof service === "object" && service.name) {
    return service.name;
  }

  const serviceDoc = await Service.findById(service).select("name").lean();
  return serviceDoc?.name || "service";
};

const resolveDateLabel = (value) => {
  if (!value) {
    return "your selected date";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "your selected date" : parsed.toLocaleString();
};

const createNotification = async ({ recipient, actor, title, type, content, destination, metadata = {} }) => {
  if (!recipient) {
    return null;
  }

  return Notification.create({
    recipient,
    actor,
    title,
    type,
    content,
    destination,
    metadata,
  });
};

const createBookingNotifications = async (booking, eventType = "BOOKING_CREATED") => {
  const serviceName = await resolveServiceName(booking.service);
  const dateLabel = resolveDateLabel(booking.expectedAt);
  const destination = `/bookings/${booking._id}`;

  const recipients = [
    {
      recipient: booking.client,
      actor: booking.provider,
      title: "Booking received",
      content: `Your booking for ${serviceName} on ${dateLabel} has been received.`,
    },
    {
      recipient: booking.provider,
      actor: booking.client,
      title: eventType === "BOOKING_STATUS_UPDATED" ? "Booking updated" : "New booking request",
      content:
        eventType === "BOOKING_STATUS_UPDATED"
          ? `The booking for ${serviceName} was updated to ${booking.status}.`
          : `You have a new booking request for ${serviceName} on ${dateLabel}.`,
    },
  ];

  return Promise.all(
    recipients.map((item) =>
      createNotification({
        recipient: item.recipient,
        actor: item.actor,
        title: item.title,
        type: eventType,
        content: item.content,
        destination,
        metadata: {
          bookingId: booking._id,
          status: booking.status,
          serviceName,
          expectedAt: booking.expectedAt,
        },
      })
    )
  );
};

const createTransactionNotifications = async (transaction, eventType = "TRANSACTION_CREATED") => {
  const booking = transaction.booking?._id ? transaction.booking : await Booking.findById(transaction.booking).select("client provider service expectedAt status").lean();

  if (!booking) {
    return [];
  }

  const serviceName = await resolveServiceName(booking.service);
  const destination = `/transactions/${transaction._id}`;
  const amountLabel = `${Number(transaction.amount || 0)} ${transaction.currency || "TND"}`;

  return Promise.all([
    createNotification({
      recipient: booking.client,
      actor: booking.provider,
      title: eventType === "TRANSACTION_STATUS_UPDATED" ? "Payment updated" : "Payment created",
      type: eventType,
      content:
        eventType === "TRANSACTION_STATUS_UPDATED"
          ? `Your payment for ${serviceName} is now ${transaction.status}.`
          : `A payment of ${amountLabel} has been created for ${serviceName}.`,
      destination,
      metadata: {
        bookingId: booking._id,
        transactionId: transaction._id,
        status: transaction.status,
        serviceName,
      },
    }),
    createNotification({
      recipient: booking.provider,
      actor: booking.client,
      title: eventType === "TRANSACTION_STATUS_UPDATED" ? "Transaction updated" : "New payment record",
      type: eventType,
      content:
        eventType === "TRANSACTION_STATUS_UPDATED"
          ? `The payment for ${serviceName} is now ${transaction.status}.`
          : `A payment of ${amountLabel} is pending for ${serviceName}.`,
      destination,
      metadata: {
        bookingId: booking._id,
        transactionId: transaction._id,
        status: transaction.status,
        serviceName,
      },
    }),
  ]);
};

const listNotificationsForUser = async ({ userId, userType, unreadOnly = false, scope = "mine" }) => {
  const query = {};

  if (scope !== "all" || userType !== "ADMIN") {
    query.recipient = userId;
  }

  if (unreadOnly) {
    query.readAt = null;
  }

  const [items, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate("recipient", "name type email")
      .populate("actor", "name type email")
      .sort({ createdAt: -1 })
      .lean(),
    Notification.countDocuments({
      recipient: scope === "all" && userType === "ADMIN" ? { $exists: true } : userId,
      readAt: null,
    }),
  ]);

  return { items, unreadCount };
};

const markNotificationAsRead = async ({ notificationId, userId, userType }) => {
  const query = { _id: notificationId };

  if (userType !== "ADMIN") {
    query.recipient = userId;
  }

  return Notification.findOneAndUpdate(
    query,
    { $set: { readAt: new Date() } },
    { new: true }
  )
    .populate("recipient", "name type email")
    .populate("actor", "name type email")
    .lean();
};

const markAllNotificationsAsRead = async ({ userId, userType }) => {
  const query = userType === "ADMIN" ? { readAt: null } : { recipient: userId, readAt: null };
  const result = await Notification.updateMany(query, { $set: { readAt: new Date() } });
  return result.modifiedCount || 0;
};

module.exports = {
  createNotification,
  createBookingNotifications,
  createTransactionNotifications,
  listNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};