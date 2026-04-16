//Importer les modeles et les utilitaires nécessaires
const { ReservationDetail } = require("../models/ReservationDetail");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les details de reservation
const listReservationDetails = asyncHandler(async (req, res) => {
  const details = await ReservationDetail.find().sort({ createdAt: -1 }).lean();

  res.json({ items: details });
});

//Obtenir un detail de reservation par ID
const getReservationDetailById = asyncHandler(async (req, res) => {
  const detail = await ReservationDetail.findById(req.params.id).lean();
  if (!detail) {
    const error = new Error("ReservationDetail not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(detail);
});

//Créer un detail de reservation
const createReservationDetail = asyncHandler(async (req, res) => {
  const { description, address, urgent } = req.body;

  const detail = await ReservationDetail.create({ description, address, urgent });

  res.status(201).json(detail);
});

//Supprimer un detail de reservation
const deleteReservationDetail = asyncHandler(async (req, res) => {
  const detail = await ReservationDetail.findByIdAndDelete(req.params.id);
  if (!detail) {
    const error = new Error("ReservationDetail not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "ReservationDetail deleted" });
});

//Mettre à jour un detail de reservation
const updateReservationDetail = asyncHandler(async (req, res) => {
  const { description, address, urgent } = req.body;
    const detail = await ReservationDetail.findById(req.params.id);
    if (!detail) {
      const error = new Error("ReservationDetail not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(detail, { description, address, urgent });
    await detail.save();
    res.json(detail);
});

//Exporter les fonctions du contrôleur
module.exports = { listReservationDetails, createReservationDetail, deleteReservationDetail, updateReservationDetail, getReservationDetailById };
