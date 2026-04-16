//Importer Mongoose pour définir le schéma de réservation
const mongoose = require("mongoose");

//Définir le schéma de réservation pour les clients et les prestataires de services
const bookingSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "IN_PROGRESS", "DONE", "CANCELLED"],
      default: "PENDING",
    },
    expectedAt: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    currency: { type: String, default: "TND" },
    detail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReservationDetail",
      required: true,
    },
    tracking: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tracking" }],
  },
  { timestamps: true }
);

//Créer le modèle de réservation à partir du schéma
const Booking = mongoose.model("Booking", bookingSchema);

//Exporter le modèle de réservation pour l'utiliser dans d'autres parties de l'application
module.exports = { Booking };
