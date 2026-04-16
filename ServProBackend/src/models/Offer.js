//Importer Mongoose pour définir le schéma de l'offre
const mongoose = require("mongoose");

//Définir le schéma de l'offre pour les services proposés par les prestataires
const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    basePrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    validUntil: { type: Date },
    active: { type: Boolean, default: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  },
  { timestamps: true }
);

//Créer le modèle de l'offre à partir du schéma
const Offer = mongoose.model("Offer", offerSchema);

//Exporter le modèle de l'offre pour l'utiliser dans d'autres parties de l'application
module.exports = { Offer };
