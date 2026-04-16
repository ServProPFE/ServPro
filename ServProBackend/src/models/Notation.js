//Importer Mongoose pour définir le schéma de notation
const mongoose = require("mongoose");

//Définir le schéma de notation pour les prestataires de services
const notationSchema = new mongoose.Schema(
  {
    average: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

//Créer le modèle de notation à partir du schéma
const Notation = mongoose.model("Notation", notationSchema);

//Exporter le modèle de notation pour l'utiliser dans d'autres parties de l'application
module.exports = { Notation };
