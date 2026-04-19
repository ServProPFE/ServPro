//Importer les modeles et les utilitaires nécessaires
const { Booking } = require("../models/Booking");
const { Transaction } = require("../models/Transaction");
const { Invoice } = require("../models/Invoice");
const { Service } = require("../models/Service");
const { Offer } = require("../models/Offer");
const {
  createBookingNotifications,
  createTransactionNotifications,
} = require("../services/notificationService");
const { asyncHandler } = require("../utils/asyncHandler");

const roundTo2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const generateInvoiceNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(1000 + Math.random() * 9000));
  return `INV-${y}${m}${d}-${random}`;
};

const ensureInvoiceForBooking = async (bookingDoc) => {
  if (!bookingDoc || !["CONFIRMED", "DONE"].includes(bookingDoc.status)) {
    return;
  }

  const existingInvoice = await Invoice.findOne({ booking: bookingDoc._id }).select("_id").lean();
  if (existingInvoice) {
    return;
  }

  await Invoice.create({
    number: generateInvoiceNumber(),
    total: bookingDoc.totalPrice,
    booking: bookingDoc._id,
  });
};

const getBookingPriceWithOffer = async (serviceId) => {
  const serviceDoc = await Service.findById(serviceId).lean();

  if (!serviceDoc) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const offer = await Offer.findOne({
    service: serviceId,
    active: true,
    $or: [{ validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gte: now } }],
  })
    .sort({ discount: -1, createdAt: -1 })
    .lean();

  const basePrice = Number(offer?.basePrice ?? serviceDoc.priceMin ?? 0);
  const discountPct = Math.max(0, Math.min(Number(offer?.discount ?? 0), 100));
  const discountedPrice = roundTo2(basePrice * (1 - discountPct / 100));

  return {
    totalPrice: discountedPrice,
    currency: serviceDoc.currency || "TND",
  };
};

//Créer une nouvelle réservation
const createBooking = asyncHandler(async (req, res) => {
  const {
    client,
    provider,
    service,
    status,
    expectedAt,
    detail,
    tracking,
  } = req.body;

  const priceInfo = await getBookingPriceWithOffer(service);

  const booking = await Booking.create({
    client,
    provider,
    service,
    status,
    expectedAt,
    totalPrice: priceInfo.totalPrice,
    currency: priceInfo.currency,
    detail,
    tracking,
  });

  try {
    await createBookingNotifications(booking, "BOOKING_CREATED");
  } catch (notificationError) {
    console.error("Failed to create booking notifications:", notificationError);
  }

  // Automatically create a transaction if booking is created as CONFIRMED
  if (status === 'CONFIRMED') {
    try {
      const transaction = await Transaction.create({
        booking: booking._id,
        amount: booking.totalPrice,
        currency: booking.currency || 'TND',
        method: 'CASH', // Default payment method
        status: 'PENDING',
      });

      await createTransactionNotifications({
        _id: transaction._id,
        booking,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
      }, "TRANSACTION_CREATED");
    } catch (transactionError) {
      // Log error but don't fail the booking creation
      console.error('Failed to create transaction:', transactionError);
    }
  }

  try {
    await ensureInvoiceForBooking(booking);
  } catch (invoiceError) {
    console.error('Failed to create invoice:', invoiceError);
  }

  res.status(201).json(booking);
});

//Mettre à jour le statut d'une réservation
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const booking = await Booking.findById(req.params.id)
    .populate('client', 'name email phone')
    .populate('service', 'name category')
    .populate('provider', 'name');

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  const oldStatus = booking.status;
  booking.status = status;

  await booking.save();

  try {
    await createBookingNotifications(booking, "BOOKING_STATUS_UPDATED");
  } catch (notificationError) {
    console.error("Failed to create booking status notifications:", notificationError);
  }

  // Automatically create a transaction when booking is confirmed
  if (status === 'CONFIRMED' && oldStatus !== 'CONFIRMED') {
    try {
      const existingTransaction = await Transaction.findOne({ booking: booking._id });
      
      // Only create if no transaction exists for this booking
      if (!existingTransaction) {
        const transaction = await Transaction.create({
          booking: booking._id,
          amount: booking.totalPrice,
          currency: booking.currency || 'TND',
          method: 'CASH', // Default payment method
          status: 'PENDING',
        });

        await createTransactionNotifications({
          _id: transaction._id,
          booking,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
        }, "TRANSACTION_CREATED");
      }
    } catch (transactionError) {
      // Log error but don't fail the booking status update
      console.error('Failed to create transaction:', transactionError);
    }
  }

  try {
    await ensureInvoiceForBooking(booking);
  } catch (invoiceError) {
    console.error('Failed to create invoice:', invoiceError);
  }

  res.json(booking);
});

//Supprimer une réservation
const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Booking deleted" });
});

//Lister les réservations avec des filtres optionnels
const listBookings = asyncHandler(async (req, res) => {
  const { clientId, providerId, status } = req.query;
  const query = {};
  
  if (clientId) {
    query.client = clientId;
  }
  if (providerId) {
    query.provider = providerId;
  }
  if (status) {
    query.status = status;
  }

  const bookings = await Booking.find(query)
    .populate('client', 'name email phone')
    .populate('service', 'name category')
    .populate('provider', 'name')
    .sort({ createdAt: -1 })
    .lean();

  res.json({ items: bookings });
});

//Lister une réservation par ID
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('client', 'name email phone')
    .populate('service', 'name category')
    .populate('provider', 'name')
    .lean();
  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(booking);
});

//Exporter les fonctions du contrôleur
module.exports = { createBooking, updateBookingStatus, deleteBooking, listBookings, getBookingById };
