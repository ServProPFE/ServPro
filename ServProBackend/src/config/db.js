// Importer Mongoose pour la connexion à la base de données MongoDB
const mongoose = require("mongoose");

// Fonction pour connecter à la base de données MongoDB
const connectDb = async (mongoUri) => {
  mongoose.set("strictQuery", true);

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  });
};

// Exporter la fonction de connexion à la base de données
module.exports = { connectDb };
