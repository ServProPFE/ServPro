//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { listInvoices, createInvoice,updateInvoice,deleteInvoice } = require("../controllers/invoicesController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les factures
router.get("/", authenticate, authorizeRoles("ADMIN", "PROVIDER"), listInvoices);
router.post("/", authenticate, authorizeRoles("ADMIN"), createInvoice);
router.put("/:id", authenticate, authorizeRoles("ADMIN"), updateInvoice);
router.delete("/:id", authenticate, authorizeRoles("ADMIN"), deleteInvoice);

//Exporter le routeur
module.exports = router;
