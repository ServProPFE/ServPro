//Importer les modules nécessaires
require("dotenv").config();

//Importer l'application Express et la fonction de connexion à la base de données
const { app } = require("./app");
const { connectDb } = require("./config/db");

//Définir le port et l'URI de MongoDB à partir des variables d'environnement
const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGODB_URI || "";

//Démarrer le serveur après s'être connecté à la base de données
const startServer = async () => {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  await connectDb(mongoUri);

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

//Lancer le serveur et gérer les erreurs éventuelles
startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
