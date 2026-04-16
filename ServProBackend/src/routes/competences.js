//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listCompetences, createCompetence,updateCompetence,deleteCompetence } = require("../controllers/competencesController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les competences
router.get("/", authenticate, authorizeRoles("CLIENT", "PROVIDER", "ADMIN"), listCompetences);
router.post("/", authenticate, authorizeRoles("PROVIDER", "ADMIN"), createCompetence);
router.put("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), updateCompetence);
router.delete("/:id", authenticate, authorizeRoles("PROVIDER", "ADMIN"), deleteCompetence);

//Exporter le routeur
module.exports = router;
