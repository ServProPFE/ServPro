const{Transaction} = require("../models/Transaction");
const { Booking } = require("../models/Booking");
const { Commission } = require("../models/Commission");
const { createTransactionNotifications } = require("../services/notificationService");
const { asyncHandler } = require("../utils/asyncHandler");

const roundTo2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const settleTransactionForProvider = async (transactionDoc) => {
  if (transactionDoc?.status !== "SUCCESS") {
    return;
  }

  // Idempotent behavior: do not recreate settlement if already marked as paid.
  if (transactionDoc.providerPayoutStatus === "PAID") {
    return;
  }

  const booking = await Booking.findById(transactionDoc.booking).select("_id provider").lean();
  if (!booking?.provider) {
    const error = new Error("Cannot settle transaction: booking/provider not found");
    error.statusCode = 400;
    throw error;
  }

  const configuredPercentage = Number(process.env.COMMISSION_PERCENTAGE ?? 10);
  const percentage = Math.max(0, Math.min(configuredPercentage, 100));
  const grossAmount = Number(transactionDoc.amount || 0);

  let commissionDoc = null;
  if (transactionDoc.commission) {
    commissionDoc = await Commission.findById(transactionDoc.commission);
  }

  if (!commissionDoc) {
    commissionDoc = await Commission.findOne({ booking: transactionDoc.booking });
  }

  if (!commissionDoc) {
    commissionDoc = await Commission.create({
      booking: transactionDoc.booking,
      percentage,
      amount: roundTo2(grossAmount * (percentage / 100)),
    });
  }

  const commissionAmount = roundTo2(Number(commissionDoc.amount || 0));
  const providerAmount = Math.max(0, roundTo2(grossAmount - commissionAmount));

  transactionDoc.fees = commissionAmount;
  transactionDoc.providerAmount = providerAmount;
  transactionDoc.commission = commissionDoc._id;
  transactionDoc.providerPayoutStatus = "PAID";
  transactionDoc.providerPaidAt = new Date();
};

//Créer une nouvelle transaction
const createTransaction = asyncHandler(async (req, res) => {
  const { booking, amount, currency, method, status } = req.body;
  const transaction = await Transaction.create({
    booking,
    amount,
    currency,
    method: method || 'CASH',
    status,
  });

  try {
    await createTransactionNotifications(transaction, "TRANSACTION_CREATED");
  } catch (notificationError) {
    console.error("Failed to create transaction notifications:", notificationError);
  }

  if (transaction.status === "SUCCESS") {
    await settleTransactionForProvider(transaction);
    await transaction.save();

    try {
      await createTransactionNotifications(transaction, "TRANSACTION_STATUS_UPDATED");
    } catch (notificationError) {
      console.error("Failed to create transaction success notifications:", notificationError);
    }
  }

  const populatedTransaction = await Transaction.findById(transaction._id)
    .populate({
      path: 'booking',
      populate: [
        { path: 'service', select: 'name' },
        { path: 'provider', select: 'name' },
        { path: 'client', select: 'name' }
      ]
    });
  res.status(201).json(populatedTransaction);
});

//Obtenir une transaction par ID
const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate({
      path: 'booking',
      populate: [
        { path: 'service', select: 'name' },
        { path: 'provider', select: 'name' },
        { path: 'client', select: 'name' }
      ]
    })
    .lean();
  if (!transaction) {
    const error = new Error("Transaction not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(transaction);
});

//Mettre à jour le statut d'une transaction
const updateTransactionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const transaction = await Transaction.findById(req.params.id);
  if (!transaction) {
    const error = new Error("Transaction not found");
    error.statusCode = 404;
    throw error;
  }

  transaction.status = status;

  if (status === "SUCCESS") {
    await settleTransactionForProvider(transaction);
  }

  await transaction.save();

  try {
    await createTransactionNotifications(transaction, "TRANSACTION_STATUS_UPDATED");
  } catch (notificationError) {
    console.error("Failed to create transaction status notifications:", notificationError);
  }

  const updatedTransaction = await Transaction.findById(req.params.id)
    .populate({
      path: 'booking',
      populate: [
        { path: 'service', select: 'name' },
        { path: 'provider', select: 'name' },
        { path: 'client', select: 'name' }
      ]
    });
  res.json(updatedTransaction);
});

//Supprimer une transaction
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByIdAndDelete(req.params.id);
  if (!transaction) {
    const error = new Error("Transaction not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Transaction deleted" });
});

//Lister toutes les transactions
const listTransactions = asyncHandler(async (req, res) => {
  const query = {};
  const userType = req.user?.type;
  const userId = req.user?.id;

  if (userType === "CLIENT" && userId) {
    const bookingIds = await Booking.find({ client: userId }).distinct("_id");
    query.booking = { $in: bookingIds };
  }

  if (userType === "PROVIDER" && userId) {
    const bookingIds = await Booking.find({ provider: userId }).distinct("_id");
    query.booking = { $in: bookingIds };
  }

  const transactions = await Transaction.find(query)
    .populate({
      path: 'booking',
      populate: [
        { path: 'service', select: 'name' },
        { path: 'provider', select: 'name' },
        { path: 'client', select: 'name' }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ items: transactions });
});

//Exporter les fonctions du contrôleur
module.exports = { createTransaction, updateTransactionStatus, deleteTransaction, listTransactions, getTransactionById };