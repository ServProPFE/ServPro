//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listAvailability, createAvailability,updateAvailability,deleteAvailability } = require("../controllers/availabilityController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les disponibilites
router.get("/", authenticate, authorizeRoles("CLIENT", "PROVIDER", "ADMIN"), listAvailability);
router.post("/", authenticate, authorizeRoles("PROVIDER", "ADMIN"), createAvailability);
router.put("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), updateAvailability);
router.delete("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), deleteAvailability);

//Exporter le routeur
module.exports = router;
