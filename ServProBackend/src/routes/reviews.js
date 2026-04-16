//Importer les modules nécessaires
const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

//Importer les fonctions du contrôleur
const { createReview,listReviewsByClient,listReviewsByProvider,updateReview,deleteReview,listReviews } = require("../controllers/reviewsController");

//Créer un routeur Express
const router = express.Router();

//Définir la route pour créer une nouvelle évaluation
router.post("/", authenticate, authorizeRoles("CLIENT"), createReview);
router.get("/provider/:providerId", listReviewsByProvider);
router.get("/client/:clientId", authenticate, authorizeRoles("CLIENT", "ADMIN"), listReviewsByClient);
router.get("/", listReviews);
router.put("/:id", authenticate, authorizeRoles("CLIENT", "ADMIN"), updateReview);
router.delete("/:id", authenticate, authorizeRoles("CLIENT", "ADMIN"), deleteReview);

//Exporter le routeur
module.exports = router;
