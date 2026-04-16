//Importer les modeles et les utilitaires nécessaires
const { Commission } = require("../models/Commission");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les commissions avec un filtre optionnel
const listCommissions = asyncHandler(async (req, res) => {
  const { bookingId } = req.query;
  const query = {};

  if (bookingId) {
    query.booking = bookingId;
  }

  const commissions = await Commission.find(query)
    .populate({
      path: 'booking',
      select: 'client provider totalPrice',
      populate: [
        { path: 'client', select: 'name email' },
        { path: 'provider', select: 'name email' }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ items: commissions });
});

//Obtenir une commission par ID
const getCommissionById = asyncHandler(async (req, res) => {
  const commission = await Commission.findById(req.params.id).lean();
  if (!commission) {
    const error = new Error("Commission not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(commission);
});

//Créer une nouvelle commission
const createCommission = asyncHandler(async (req, res) => {
  const { percentage, amount, booking } = req.body;

  const commission = await Commission.create({ percentage, amount, booking });

  res.status(201).json(commission);
});

//Mettre à jour une commission
const updateCommission = asyncHandler(async (req, res) => {
  const { percentage, amount } = req.body;
    const commission = await Commission.findById(req.params.id);
    if (!commission) {
      const error = new Error("Commission not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(commission, { percentage, amount });
    await commission.save();
    res.json(commission);
});

//Supprimer une commission
const deleteCommission = asyncHandler(async (req, res) => {
  const commission = await Commission.findByIdAndDelete(req.params.id);
  if (!commission) {
    const error = new Error("Commission not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Commission deleted" });
});

//Exporter les fonctions du contrôleur
module.exports = { listCommissions, createCommission, updateCommission, deleteCommission, getCommissionById };
