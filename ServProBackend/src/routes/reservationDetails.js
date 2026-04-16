//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const {
  listReservationDetails,
  createReservationDetail,
  updateReservationDetail,
  deleteReservationDetail,
} = require("../controllers/reservationDetailsController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les details de reservation
router.get("/", authenticate, authorizeRoles("CLIENT", "PROVIDER", "ADMIN"), listReservationDetails);
router.post("/", authenticate, authorizeRoles("CLIENT"), createReservationDetail);
router.put("/:id", authenticate, authorizeRoles("CLIENT", "ADMIN"), updateReservationDetail);
router.delete("/:id", authenticate, authorizeRoles("CLIENT", "ADMIN"), deleteReservationDetail);

//Exporter le routeur
module.exports = router;
