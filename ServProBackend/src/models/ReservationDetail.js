//Importer Mongoose pour définir le schéma des détails de réservation
const mongoose = require("mongoose");

//Définir le schéma des détails de réservation pour les réservations de services
const reservationDetailSchema = new mongoose.Schema(
  {
    description: { type: String },
    address: { type: String, required: true },
    urgent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

//Créer le modèle des détails de réservation à partir du schéma
const ReservationDetail = mongoose.model("ReservationDetail", reservationDetailSchema);

//Exporter le modèle des détails de réservation pour l'utiliser dans d'autres parties de l'application
module.exports = { ReservationDetail };
