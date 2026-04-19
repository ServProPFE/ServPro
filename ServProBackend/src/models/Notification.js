//Importer Mongoose pour définir le schéma de notification
const mongoose = require("mongoose");

//Définir le schéma de notification pour les utilisateurs
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: { type: String, required: true },
    type: { type: String, required: true },
    content: { type: String, required: true },
    destination: { type: String, required: true },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

//Créer le modèle de notification à partir du schéma
const Notification = mongoose.model("Notification", notificationSchema);

//Exporter le modèle de notification pour l'utiliser dans d'autres parties de l'application
module.exports = { Notification };
