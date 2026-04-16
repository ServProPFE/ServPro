//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listPackages, createPackage,updatePackage,deletePackage } = require("../controllers/packagesController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les forfaits
router.get("/", listPackages);
router.post("/", authenticate, authorizeRoles("ADMIN"), createPackage);
router.put("/:id", authenticate, authorizeRoles("ADMIN"), updatePackage);
router.delete("/:id", authenticate, authorizeRoles("ADMIN"), deletePackage);

//Exporter le routeur
module.exports = router;
