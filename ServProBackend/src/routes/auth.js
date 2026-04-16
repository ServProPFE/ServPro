//Importer les modules nécessaires
const express = require("express");

//Importer les fonctions du contrôleur
const { register, login, listProviders } = require("../controllers/authController");

//Créer un routeur Express
const router = express.Router();

//Définir les routes d'authentification
router.post("/register", register);
router.post("/login", login);
router.get("/providers", listProviders);

//Exporter le routeur
module.exports = router;
