//Importer Mongoose pour définir le schéma de suivi des réservations
const mongoose = require("mongoose");

//Définir le schéma de suivi pour les réservations de services
const trackingSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    position: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

//Créer le modèle de suivi à partir du schéma
const Tracking = mongoose.model("Tracking", trackingSchema);

//Exporter le modèle de suivi pour l'utiliser dans d'autres parties de l'application
module.exports = { Tracking };
