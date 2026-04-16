//Importer les modeles et les utilitaires nécessaires
const { Availability } = require("../models/Availability");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les disponibilites avec un filtre optionnel
const listAvailability = asyncHandler(async (req, res) => {
  const { providerId } = req.query;
  const query = {};

  if (providerId) {
    query.provider = providerId;
  }

  const availability = await Availability.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: availability });
});

//Obtenir une disponibilite par ID
const getAvailabilityById = asyncHandler(async (req, res) => {
  const availability = await Availability.findById(req.params.id).lean();
  if (!availability) {
    const error = new Error("Availability not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(availability);
});

//Créer une disponibilite
const createAvailability = asyncHandler(async (req, res) => {
  const { day, start, end, provider } = req.body;

  const availability = await Availability.create({ day, start, end, provider });

  res.status(201).json(availability);
});

//Mettre à jour une disponibilite
const updateAvailability = asyncHandler(async (req, res) => {
  const { day, start, end } = req.body;
  const availability = await Availability.findById(req.params.id);
    if (!availability) {
      const error = new Error("Availability not found");
      error.statusCode = 404;
      throw error;
    }
  Object.assign(availability, { day, start, end });
  await availability.save();
  res.json(availability);
});

//Supprimer une disponibilite
const deleteAvailability = asyncHandler(async (req, res) => {
  const availability = await Availability.findByIdAndDelete(req.params.id);
  if (!availability) {
    const error = new Error("Availability not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Availability deleted" });
});

//Exporter les fonctions du contrôleur
module.exports = { listAvailability, createAvailability, updateAvailability, deleteAvailability, getAvailabilityById };
