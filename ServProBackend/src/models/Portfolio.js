//Importer Mongoose pour définir le schéma du portfolio
const mongoose = require("mongoose");

//Définir le schéma du portfolio pour les prestataires de services
const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    images: [{ type: String }],
    certificates: [{ type: String }],
    description: { type: String },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

//Créer le modèle du portfolio à partir du schéma
const Portfolio = mongoose.model("Portfolio", portfolioSchema);

//Exporter le modèle du portfolio pour l'utiliser dans d'autres parties de l'application
module.exports = { Portfolio };
