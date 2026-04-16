//Importer Mongoose pour définir le schéma de certification
const mongoose = require("mongoose");

//Définir le schéma de certification pour les prestataires de services
const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    authority: { type: String },
    expiresAt: { type: Date },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

//Créer le modèle de certification à partir du schéma
const Certification = mongoose.model("Certification", certificationSchema);

//Exporter le modèle de certification pour l'utiliser dans d'autres parties de l'application
module.exports = { Certification };
