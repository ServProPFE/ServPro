//Importer les modeles et les utilitaires nécessaires
const { Notation } = require("../models/Notation");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les notations avec un filtre optionnel
const listNotations = asyncHandler(async (req, res) => {
  const { providerId } = req.query;
  const query = {};

  if (providerId) {
    query.provider = providerId;
  }

  const notations = await Notation.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: notations });
});

//Obtenir une notation par ID
const getNotationById = asyncHandler(async (req, res) => {
  const notation = await Notation.findById(req.params.id).lean();
  if (!notation) {
    const error = new Error("Notation not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(notation);
});

//Créer une notation
const createNotation = asyncHandler(async (req, res) => {
  const { average, total, provider } = req.body;

  const notation = await Notation.create({ average, total, provider });

  res.status(201).json(notation);
});

//Supprimer une notation
const deleteNotation = asyncHandler(async (req, res) => {
  const notation = await Notation.findByIdAndDelete(req.params.id);
  if (!notation) {
    const error = new Error("Notation not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Notation deleted" });
});

//Mettre à jour une notation
const updateNotation = asyncHandler(async (req, res) => {
  const { average, total } = req.body;
    const notation = await Notation.findById(req.params.id);
    if (!notation) {
    const error = new Error("Notation not found");
    error.statusCode = 404;
    throw error;
  }
    Object.assign(notation, { average, total });
    await notation.save();
    res.json(notation);
});

//Exporter les fonctions du contrôleur
module.exports = { listNotations, createNotation, updateNotation, deleteNotation, getNotationById };
