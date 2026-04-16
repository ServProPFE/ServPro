//Importer Mongoose pour définir le schéma de facture
const mongoose = require("mongoose");

//Définir le schéma de facture pour les réservations
const invoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    total: { type: Number, required: true },
    issuedAt: { type: Date, default: Date.now },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  },
  { timestamps: true }
);

//Créer le modèle de facture à partir du schéma
const Invoice = mongoose.model("Invoice", invoiceSchema);

//Exporter le modèle de facture pour l'utiliser dans d'autres parties de l'application
module.exports = { Invoice };
