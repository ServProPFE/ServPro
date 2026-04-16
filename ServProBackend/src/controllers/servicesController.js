//Importer les modeles et les utilitaires nécessaires
const { Service } = require("../models/Service");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les services avec des filtres optionnels
const listServices = asyncHandler(async (req, res) => {
  const { category, providerId } = req.query;
  const query = {};

  if (category) {
    query.category = category;
  }

  if (providerId) {
    query.provider = providerId;
  }

  const services = await Service.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: services });
});

//Obtenir un service par ID
const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).populate('provider', 'name email phone').lean();
  
  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  res.json(service);
});

//Créer un nouveau service
const createService = asyncHandler(async (req, res) => {
  const {
    provider,
    name,
    category,
    priceMin,
    priceMax,
    duration,
    description,
    currency,
  } = req.body;

  const service = await Service.create({
    provider,
    name,
    category,
    priceMin,
    priceMax,
    duration,
    description,
    currency,
  });

  res.status(201).json(service);
});

//Mettre à jour un service
const updateService = asyncHandler(async (req, res) => {
  const { name, category, priceMin, priceMax, duration, description, currency } = req.body;
    const service = await Service.findById(req.params.id);
    if (!service) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(service, {
      name,
      category,
      priceMin,
      priceMax,
      duration,
      description,
      currency: currency || service.currency || "TND",
    });
    await service.save();
    res.json(service);
});

//Supprimer un service
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Service deleted" });
});

//Exporter les fonctions du contrôleur
module.exports = { listServices, getServiceById, createService, updateService, deleteService };
