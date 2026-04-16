const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
//Importer les fonctions du contrôleur
const {
	listTransactions,
	createTransaction,
	updateTransactionStatus,
	deleteTransaction,
} = require("../controllers/transactionController");
//Créer un routeur Express
const router = express.Router();
//Définir les routes pour les transactions
router.get("/", authenticate, authorizeRoles("ADMIN", "CLIENT", "PROVIDER"), listTransactions);
router.post("/", authenticate, authorizeRoles("CLIENT"), createTransaction);
router.put("/:id", authenticate, authorizeRoles("ADMIN"), updateTransactionStatus);
router.delete("/:id", authenticate, authorizeRoles("ADMIN"), deleteTransaction);

//Exporter le routeur
module.exports = router;