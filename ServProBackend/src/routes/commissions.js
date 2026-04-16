//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listCommissions, createCommission,updateCommission,deleteCommission } = require("../controllers/commissionsController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les commissions
router.get("/", authenticate, authorizeRoles("ADMIN"), listCommissions);
router.post("/", authenticate, authorizeRoles("ADMIN"), createCommission);
router.put("/:id", authenticate, authorizeRoles("ADMIN"), updateCommission);
router.delete("/:id", authenticate, authorizeRoles("ADMIN"), deleteCommission);

//Exporter le routeur
module.exports = router;
