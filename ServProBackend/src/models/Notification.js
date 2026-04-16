//Importer Mongoose pour définir le schéma de notification
const mongoose = require("mongoose");

//Définir le schéma de notification pour les utilisateurs
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, required: true },
    content: { type: String, required: true },
    destination : { type: String , required: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

//Créer le modèle de notification à partir du schéma
const Notification = mongoose.model("Notification", notificationSchema);

//Exporter le modèle de notification pour l'utiliser dans d'autres parties de l'application
module.exports = { Notification };
