//Importer Mongoose pour définir le schéma des services
const mongoose = require("mongoose");

//Définir le schéma des services pour les prestataires de services
const serviceSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "PLOMBERIE",
        "ELECTRICITE",
        "CLIMATISATION",
        "NETTOYAGE",
        "AUTRE",
      ],
      required: true,
    },
    priceMin: { type: Number, required: true },
    duration: { type: Number, required: true },
    description: { type: String, default: "" },
    currency: { type: String, default: "TND" },
  },
  { timestamps: true }
);

//Créer le modèle de service à partir du schéma
const Service = mongoose.model("Service", serviceSchema);

//Exporter le modèle de service pour l'utiliser dans d'autres parties de l'application
module.exports = { Service };
