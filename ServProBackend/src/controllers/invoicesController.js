//Importer les modeles et les utilitaires nécessaires
const { Invoice } = require("../models/Invoice");
const { Booking } = require("../models/Booking");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les factures avec un filtre optionnel
const listInvoices = asyncHandler(async (req, res) => {
  const { bookingId } = req.query;
  const query = {};

  const providerId = (req.user?.id || req.user?._id || "").toString();

  if (req.user?.type === "PROVIDER") {
    const providerBookings = await Booking.find({ provider: providerId }).select("_id").lean();
    const providerBookingIds = providerBookings.map((booking) => booking._id);
    const providerBookingIdSet = new Set(providerBookingIds.map((id) => id.toString()));

    if (providerBookingIds.length === 0) {
      return res.json({ items: [] });
    }

    if (bookingId) {
      if (!providerBookingIdSet.has(bookingId.toString())) {
        return res.json({ items: [] });
      }
      query.booking = bookingId;
    } else {
      query.booking = { $in: providerBookingIds };
    }
  }

  if (bookingId && req.user?.type !== "PROVIDER") {
    query.booking = bookingId;
  }

  let invoices = await Invoice.find(query)
    .populate({
      path: 'booking',
      select: 'client provider service totalPrice',
      populate: [
        { path: 'client', select: 'name email' },
        { path: 'provider', select: 'name email' },
        { path: 'service', select: 'name' }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ items: invoices });
});

//Obtenir une facture par ID
const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate({
      path: 'booking',
      select: 'client provider service totalPrice',
      populate: [
        { path: 'client', select: 'name email' },
        { path: 'provider', select: 'name email' },
        { path: 'service', select: 'name' }
      ]
    })
    .lean();
  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(invoice);
});

//Créer une nouvelle facture
const createInvoice = asyncHandler(async (req, res) => {
  const { number, total, issuedAt, booking } = req.body;

  const invoice = await Invoice.create({ number, total, issuedAt, booking });

  res.status(201).json(invoice);
});

//Mettre à jour une facture
const updateInvoice = asyncHandler(async (req, res) => {
  const { number, total, issuedAt } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      const error = new Error("Invoice not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(invoice, { number, total, issuedAt });
    await invoice.save();
    res.json(invoice);
});

//Supprimer une facture
const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndDelete(req.params.id);
  if (!invoice) {
    const error = new Error("Invoice not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Invoice deleted" });
});

//Exporter les fonctions du contrôleur
module.exports = { listInvoices, createInvoice, updateInvoice, deleteInvoice, getInvoiceById };
