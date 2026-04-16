//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listNotations, createNotation,updateNotation,deleteNotation } = require("../controllers/notationsController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les notations
router.get("/", authenticate, authorizeRoles("CLIENT", "PROVIDER", "ADMIN"), listNotations);
router.post("/", authenticate, authorizeRoles("ADMIN"), createNotation);
router.put("/:id", authenticate, authorizeRoles("ADMIN"), updateNotation);
router.delete("/:id", authenticate, authorizeRoles("ADMIN"), deleteNotation);

//Exporter le routeur
module.exports = router;
