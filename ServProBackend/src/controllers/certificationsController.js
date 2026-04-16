//Importer les modeles et les utilitaires nécessaires
const { Certification } = require("../models/Certification");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les certifications avec un filtre optionnel
const listCertifications = asyncHandler(async (req, res) => {
  const { providerId } = req.query;
  const query = {};

  if (providerId) {
    query.provider = providerId;
  }

  const certifications = await Certification.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: certifications });
});

//Créer une certification
const createCertification = asyncHandler(async (req, res) => {
  const { name, authority, expiresAt, provider } = req.body;

  const certification = await Certification.create({
    name,
    authority,
    expiresAt,
    provider,
  });

  res.status(201).json(certification);
});

//Mettre à jour une certification
const updateCertification = asyncHandler(async (req, res) => {
  const { name, authority, expiresAt } = req.body;
    const certification = await Certification.findById(req.params.id);
    if (!certification) {
      const error = new Error("Certification not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(certification, { name, authority, expiresAt });
    await certification.save();
    res.json(certification);
});

//Supprimer une certification
const deleteCertification = asyncHandler(async (req, res) => {
  const certification = await Certification.findByIdAndDelete(req.params.id);
  if (!certification) {
    const error = new Error("Certification not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Certification deleted" });
});

//Obtenir une certification par ID
const getCertificationById = asyncHandler(async (req, res) => {
  const certification = await Certification.findById(req.params.id).lean();
  if (!certification) {
    const error = new Error("Certification not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(certification);
});

//Exporter les fonctions du contrôleur
module.exports = { listCertifications, createCertification, updateCertification, deleteCertification, getCertificationById };
