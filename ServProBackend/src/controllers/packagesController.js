//Importer les modeles et les utilitaires nécessaires
const { Package } = require("../models/Package");
const { asyncHandler } = require("../utils/asyncHandler");

//Lister les forfaits
const listPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find().sort({ createdAt: -1 }).lean();

  res.json({ items: packages });
});

//Obtenir un forfait par ID
const getPackageById = asyncHandler(async (req, res) => {
  const pack = await Package.findById(req.params.id).lean();
  if (!pack) {
    const error = new Error("Package not found");
    error.statusCode = 404;
    throw error;
  }
  res.json(pack);
});

//Créer un nouveau forfait
const createPackage = asyncHandler(async (req, res) => {
  const { name, months, numberVisits, monthlyPrice } = req.body;

  const pack = await Package.create({ name, months, numberVisits, monthlyPrice });

  res.status(201).json(pack);
});

//Mettre à jour un forfait
const updatePackage = asyncHandler(async (req, res) => {
  const { name, months, numberVisits, monthlyPrice } = req.body;
    const pack = await Package.findById(req.params.id);
    if (!pack) {
      const error = new Error("Package not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(pack, { name, months, numberVisits, monthlyPrice });
    await pack.save();
    res.json(pack);
});

//Supprimer un forfait
const deletePackage = asyncHandler(async (req, res) => {
  const pack = await Package.findByIdAndDelete(req.params.id);
  if (!pack) {
    const error = new Error("Package not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Package deleted" });
});

//Exporter les fonctions du contrôleur
module.exports = { listPackages, createPackage, updatePackage, deletePackage, getPackageById };
