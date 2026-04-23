//Importer Mongoose pour définir le schéma des utilisateurs
const mongoose = require("mongoose");

//Définir le schéma des utilisateurs pour les clients, prestataires de services et administrateurs
const userSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["CLIENT", "PROVIDER", "ADMIN"],
      required: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    passwordHash: { type: String, required: true },
    providerProfile: {
      companyName: { type: String },
      license: { type: String },
      insurance: { type: String },
      location: { type: String },
      turnover: { type: String },
      experienceYears: { type: Number, default: 0 },
      serviceRadius: { type: Number, default: 0 },
      verificationStatus: {
        type: String,
        enum: ["PENDING", "VERIFIED", "REJECTED"],
        default: "PENDING",
      },
      portfolio: [{ type: mongoose.Schema.Types.ObjectId, ref: "Portfolio" }],
      competences: [{ type: mongoose.Schema.Types.ObjectId, ref: "Competence" }],
      availability: [{ type: mongoose.Schema.Types.ObjectId, ref: "Availability" }],
      certifications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certification" }],
    },
    notation: { type: mongoose.Schema.Types.ObjectId, ref: "Notation" },
  },
  { timestamps: true }
);

//Créer le modèle d'utilisateur à partir du schéma
const User = mongoose.model("User", userSchema);

//Exporter le modèle d'utilisateur pour l'utiliser dans d'autres parties de l'application
module.exports = { User };
