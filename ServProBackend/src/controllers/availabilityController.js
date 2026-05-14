//Importer les modeles et les utilitaires nécessaires
const { Availability } = require("../models/Availability");
const { asyncHandler } = require("../utils/asyncHandler");
const { getDayName } = require("../utils/availabilityHelper");

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

// Get available time slots for a provider on a specific date
const getAvailableSlots = asyncHandler(async (req, res) => {
  const { providerId, date } = req.query;

  if (!providerId || !date) {
    const error = new Error("providerId and date query parameters are required");
    error.statusCode = 400;
    throw error;
  }

  // Parse the date and get the day of week
  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) {
    const error = new Error("Invalid date format. Use YYYY-MM-DD or ISO 8601 format");
    error.statusCode = 400;
    throw error;
  }

  const dayOfWeek = targetDate.getDay();

  // Get availability for the provider on this day
  const availability = await Availability.findOne({
    provider: providerId,
    day: dayOfWeek,
  }).lean();

  if (!availability) {
    return res.json({
      date,
      providerId,
      dayOfWeek,
      available: false,
      message: `Provider is not available on ${getDayName(dayOfWeek)}`,
    });
  }

  // Return the available time range
  res.json({
    date,
    providerId,
    dayOfWeek,
    dayName: getDayName(dayOfWeek),
    available: true,
    startTime: availability.start,
    endTime: availability.end,
    availabilityId: availability._id,
  });
});

//Exporter les fonctions du contrôleur
module.exports = { listAvailability, createAvailability, updateAvailability, deleteAvailability, getAvailabilityById, getAvailableSlots };
