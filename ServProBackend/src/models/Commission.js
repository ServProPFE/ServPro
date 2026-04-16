//Importer Mongoose pour définir le schéma de commission
const mongoose = require("mongoose");

//Définir le schéma de commission pour les réservations
const commissionSchema = new mongoose.Schema(
  {
    percentage: { type: Number, required: true },
    amount: { type: Number },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  },
  { timestamps: true }
);

//Créer le modèle de commission à partir du schéma
const Commission = mongoose.model("Commission", commissionSchema);

//Exporter le modèle de commission pour l'utiliser dans d'autres parties de l'application
module.exports = { Commission };
