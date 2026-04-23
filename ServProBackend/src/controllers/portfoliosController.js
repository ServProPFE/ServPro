//Importer les modeles et les utilitaires nécessaires
const { Portfolio } = require("../models/Portfolio");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les portfolios avec un filtre optionnel
const listPortfolios = asyncHandler(async (req, res) => {
  const { providerId } = req.query;
  const query = {};

  if (providerId) {
    query.provider = providerId;
  }

  const portfolios = await Portfolio.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: portfolios });
});

//Obtenir un portfolio par ID
const getPortfolioById = asyncHandler(async (req, res) => {
  const portfolio = await Portfolio.findById(req.params.id).lean();
  if (!portfolio) {
    const error = new Error("Portfolio not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(portfolio);
});

//Créer un portfolio
const createPortfolio = asyncHandler(async (req, res) => {
  const { title, images, certificates, description, provider } = req.body;

  const portfolio = await Portfolio.create({ title, images, certificates, description, provider });

  res.status(201).json(portfolio);
});

//Supprimer un portfolio
const deletePortfolio = asyncHandler(async (req, res) => {
  const portfolio = await Portfolio.findByIdAndDelete(req.params.id);
  if (!portfolio) {
    const error = new Error("Portfolio not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Portfolio deleted" });
});

//Mettre à jour un portfolio
const updatePortfolio = asyncHandler(async (req, res) => {
  const { title, images, certificates, description } = req.body;
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) {
    const error = new Error("Portfolio not found");
    error.statusCode = 404;
    throw error;
  }
    Object.assign(portfolio, { title, images, certificates, description });
    await portfolio.save();
    res.json(portfolio);
});

//Exporter les fonctions du contrôleur
module.exports = { listPortfolios, createPortfolio, deletePortfolio, updatePortfolio, getPortfolioById };
