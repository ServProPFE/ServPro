//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listPortfolios, createPortfolio,updatePortfolio,deletePortfolio } = require("../controllers/portfoliosController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les portfolios
router.get("/", listPortfolios);
router.post("/", authenticate, authorizeRoles("PROVIDER", "ADMIN"), createPortfolio);
router.put("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), updatePortfolio);
router.delete("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), deletePortfolio);

//Exporter le routeur
module.exports = router;
