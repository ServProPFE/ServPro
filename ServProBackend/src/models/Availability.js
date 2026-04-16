//Immporter Mongoose pour définir le schéma de disponibilité
const mongoose = require("mongoose");

//Définir le schéma de disponibilité pour les prestataires de services
const availabilitySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

//Créer le modèle de disponibilité à partir du schéma
const Availability = mongoose.model("Availability", availabilitySchema);

//Exporter le modèle de disponibilité pour l'utiliser dans d'autres parties de l'application
module.exports = { Availability };
