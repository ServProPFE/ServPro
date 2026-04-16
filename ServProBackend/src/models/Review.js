//Importer Mongoose pour définir le schéma des avis
const mongoose = require("mongoose");

//Définir le schéma des avis pour les réservations de services
const reviewSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
  },
  { timestamps: true }
);

//Créer le modèle des avis à partir du schéma
const Review = mongoose.model("Review", reviewSchema);

//Exporter le modèle des avis pour l'utiliser dans d'autres parties de l'application
module.exports = { Review };
