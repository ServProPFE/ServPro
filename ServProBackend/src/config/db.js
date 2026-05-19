// Importer Mongoose pour la connexion à la base de données MongoDB
const mongoose = require("mongoose");

// Fonction pour connecter à la base de données MongoDB
const connectDb = async (mongoUri) => {
  mongoose.set("strictQuery", true);

  // Reuse existing connection when running in serverless environments
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2) {
    // Wait until connected
    await new Promise((resolve, reject) => {
      const onConnected = () => {
        cleanup();
        resolve();
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        mongoose.connection.off("connected", onConnected);
        mongoose.connection.off("error", onError);
      };
      mongoose.connection.on("connected", onConnected);
      mongoose.connection.on("error", onError);
    });
    return;
  }

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  });
};

// Exporter la fonction de connexion à la base de données
module.exports = { connectDb };
