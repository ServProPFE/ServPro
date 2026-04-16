//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listOffers, createOffer,updateOffer,deleteOffer } = require("../controllers/offersController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les offres
router.get("/", listOffers);
router.post("/", authenticate, authorizeRoles("PROVIDER", "ADMIN"), createOffer);
router.put("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), updateOffer);
router.delete("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), deleteOffer);

//Exporter le routeur
module.exports = router;
