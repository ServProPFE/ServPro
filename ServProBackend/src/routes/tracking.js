//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listTracking, createTracking,updateTracking,deleteTracking } = require("../controllers/trackingController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour le suivi
router.get("/", authenticate, authorizeRoles("CLIENT", "PROVIDER", "ADMIN"), listTracking);
router.post("/", authenticate, authorizeRoles("PROVIDER", "ADMIN"), createTracking);
router.put("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), updateTracking);
router.delete("/:id", authenticate, authorizeRoles("ADMIN"), deleteTracking);

//Exporter le routeur
module.exports = router;
