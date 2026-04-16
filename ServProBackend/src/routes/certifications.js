//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listCertifications, createCertification,updateCertification,deleteCertification } = require("../controllers/certificationsController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les certifications
router.get("/", authenticate, authorizeRoles("CLIENT", "PROVIDER", "ADMIN"), listCertifications);
router.post("/", authenticate, authorizeRoles("PROVIDER", "ADMIN"), createCertification);
router.put("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), updateCertification);
router.delete("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), deleteCertification);

//Exporter le routeur
module.exports = router;
