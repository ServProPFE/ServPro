//Importer les modeles et les utilitaires nécessaires
const { Tracking } = require("../models/Tracking");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les suivis avec filtre optionnel
const listTracking = asyncHandler(async (req, res) => {
  const { bookingId } = req.query;
  const query = {};

  if (bookingId) {
    query.booking = bookingId;
  }

  const tracking = await Tracking.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: tracking });
});

//Obtenir un suivi par ID
const getTrackingById = asyncHandler(async (req, res) => {
  const tracking = await Tracking.findById(req.params.id).lean();
  if (!tracking) {
    const error = new Error("Tracking not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(tracking);
});

//Créer un suivi
const createTracking = asyncHandler(async (req, res) => {
  const { booking, position, at } = req.body;

  const tracking = await Tracking.create({ booking, position, at });

  res.status(201).json(tracking);
});

//Mettre à jour un suivi
const updateTracking = asyncHandler(async (req, res) => {
  const { position, at } = req.body;
    const tracking = await Tracking.findById(req.params.id);
    if (!tracking) {
      const error = new Error("Tracking not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(tracking, { position, at });
    await tracking.save();
    res.json(tracking);
});

//Supprimer un suivi
const deleteTracking = asyncHandler(async (req, res) => {
  const tracking = await Tracking.findByIdAndDelete(req.params.id);
  if (!tracking) {
    const error = new Error("Tracking not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Tracking deleted" });
});

//Exporter les fonctions du contrôleur
module.exports = { listTracking, createTracking, updateTracking, deleteTracking, getTrackingById };
