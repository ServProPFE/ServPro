//Importer les modeles et les utilitaires nécessaires
const { Competence } = require("../models/Competence");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les competences avec un filtre optionnel
const listCompetences = asyncHandler(async (req, res) => {
  const { providerId, serviceId } = req.query;
  const query = {};

  if (providerId) {
    query.provider = providerId;
  }

  if (serviceId) {
    query.serviceId = serviceId;
  }

  const competences = await Competence.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: competences });
});

//Obtenir une competence par ID
const getCompetenceById = asyncHandler(async (req, res) => {
  const competence = await Competence.findById(req.params.id).lean();
  if (!competence) {
    const error = new Error("Competence not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(competence);
});

//Créer une competence
const createCompetence = asyncHandler(async (req, res) => {
  const { serviceId, level, provider } = req.body;

  const competence = await Competence.create({ serviceId, level, provider });

  res.status(201).json(competence);
});

//Supprimer une competence
const deleteCompetence = asyncHandler(async (req, res) => {
  const competence = await Competence.findByIdAndDelete(req.params.id);
  if (!competence) {
    const error = new Error("Competence not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Competence deleted" });
});

//Mettre à jour une competence
const updateCompetence = asyncHandler(async (req, res) => {
  const { serviceId, level } = req.body;
  const competence = await Competence.findById(req.params.id);
    if (!competence) {
      const error = new Error("Competence not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(competence, { serviceId, level });
    await competence.save();
    res.json(competence);
});

//Exporter les fonctions du contrôleur
module.exports = { listCompetences, createCompetence, deleteCompetence, updateCompetence, getCompetenceById };
