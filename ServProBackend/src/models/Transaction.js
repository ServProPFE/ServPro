//Importer Mongoose pour définir le schéma des transactions
const mongoose = require("mongoose");

//Définir le schéma des transactions pour les réservations de services
const transactionSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "TND" },
    method: {
      type: String,
      enum: ["CARD", "KNET", "APPLE_PAY", "GOOGLE_PAY", "PAYPAL", "CASH"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },
    provider: { type: String, default: "STRIPE" },
    externalId: { type: String },
    fees: { type: Number, default: 0 },
    providerAmount: { type: Number, default: 0 },
    providerPayoutStatus: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },
    providerPaidAt: { type: Date },
    commission: { type: mongoose.Schema.Types.ObjectId, ref: "Commission" },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
  },
  { timestamps: true }
);

//Créer le modèle de transaction à partir du schéma
const Transaction = mongoose.model("Transaction", transactionSchema);

//Exporter le modèle de transaction pour l'utiliser dans d'autres parties de l'application
module.exports = { Transaction };
