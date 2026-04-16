//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { createBooking, updateBookingStatus,deleteBooking,listBookings } = require("../controllers/bookingsController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes pour les réservations
router.post("/", authenticate, authorizeRoles("CLIENT"), createBooking);
router.patch("/:id/status", authenticate, authorizeRoles("PROVIDER", "ADMIN"), updateBookingStatus);
router.delete("/:id", authenticate, authorizeRoles("CLIENT", "ADMIN"), deleteBooking);
router.get("/", authenticate, authorizeRoles("CLIENT", "PROVIDER", "ADMIN"), listBookings);

//Exporter le routeur
module.exports = router;
