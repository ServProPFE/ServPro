//Importer les modules nécessaires
const express = require("express");

//Créer un routeur Express
const router = express.Router();

//Définir une route de santé pour vérifier que le serveur fonctionne
router.get("/", (req, res) => {
  res.json({ status: "ok" });
});

//Exporter le routeur
module.exports = router;
