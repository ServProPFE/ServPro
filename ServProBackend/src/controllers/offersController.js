//Importer les modeles et les utilitaires nécessaires
const { Offer } = require("../models/Offer");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les offres avec des filtres optionnels
const listOffers = asyncHandler(async (req, res) => {
  const { serviceId, active } = req.query;
  const query = {};

  if (serviceId) {
    query.service = serviceId;
  }

  if (active !== undefined) {
    query.active = active === "true";
  }

  const offers = await Offer.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: offers });
});

//Obtenir une offre par ID
const getOfferById = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id).lean();
  if (!offer) {
    const error = new Error("Offer not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(offer);
});

//Créer une nouvelle offre
const createOffer = asyncHandler(async (req, res) => {
  const { title, basePrice, discount, validUntil, active, service } = req.body;

  const offer = await Offer.create({
    title,
    basePrice,
    discount,
    validUntil,
    active,
    service,
  });

  res.status(201).json(offer);
});

//Mettre à jour une offre
const updateOffer = asyncHandler(async (req, res) => {
  const { title, basePrice, discount, validUntil, active } = req.body;
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      const error = new Error("Offer not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(offer, { title, basePrice, discount, validUntil, active });
    await offer.save();
    res.json(offer);
});

//Supprimer une offre
const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) {
    const error = new Error("Offer not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Offer deleted" });
});

//Exporter les fonctions du contrôleur
module.exports = { listOffers, createOffer, updateOffer, deleteOffer, getOfferById };
