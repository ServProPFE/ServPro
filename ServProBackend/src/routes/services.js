//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listServices, getServiceById, createService, updateService, deleteService } = require("../controllers/servicesController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les services
router.get("/", listServices);
router.get("/:id", getServiceById);
router.post("/", authenticate, authorizeRoles("PROVIDER", "ADMIN"), createService);
router.put("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), updateService);
router.delete("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), deleteService);

//Exporter le routeur
module.exports = router;
