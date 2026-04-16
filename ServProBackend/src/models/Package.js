//Importer Mongoose pour définir le schéma du package
const mongoose = require("mongoose");

//Définir le schéma du package pour les offres groupées de services
const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    months: { type: Number, required: true },
    numberVisits: { type: Number, required: true },
    monthlyPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

//Créer le modèle du package à partir du schéma
const Package = mongoose.model("Package", packageSchema);

//Exporter le modèle du package pour l'utiliser dans d'autres parties de l'application
module.exports = { Package };
