//Importer Mongoose pour définir le schéma de compétence
const mongoose = require("mongoose");

//Définir le schéma de compétence pour les prestataires de services
const competenceSchema = new mongoose.Schema(
  {
    serviceId: { type: String, required: true },
    level: { type: String, enum: ["BEGINNER", "INTERMEDIATE", "EXPERT"], required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

//Créer le modèle de compétence à partir du schéma
const Competence = mongoose.model("Competence", competenceSchema);

//Exporter le modèle de compétence pour l'utiliser dans d'autres parties de l'application
module.exports = { Competence };
