//Importer les modules nécessaires
require("dotenv").config();
const axios = require("axios");
const { ensureProductionSeedData } = require("./scripts/productionSeed");

//Importer l'application Express et la fonction de connexion à la base de données
const { app } = require("./app");
const { connectDb } = require("./config/db");

//Définir le port et l'URI de MongoDB à partir des variables d'environnement
const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGODB_URI || "";

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeServiceUrl = (url) => (url || "").trim().replace(/\/$/, "");

const aiWarmupEnabled = String(process.env.PYTHON_AI_WARMUP_ON_START || "false").toLowerCase() === "true";
const aiWarmupTimeoutMs = toPositiveInt(process.env.PYTHON_AI_WARMUP_TIMEOUT_MS, 30000);
const aiWarmupEndpoint = process.env.PYTHON_AI_WARMUP_ENDPOINT || "/health";
const pythonAiService = normalizeServiceUrl(process.env.PYTHON_AI_SERVICE || "");

const warmupPythonAI = async () => {
  if (!aiWarmupEnabled || !pythonAiService) {
    return;
  }

  try {
    const normalizedEndpoint = aiWarmupEndpoint.startsWith("/") ? aiWarmupEndpoint : `/${aiWarmupEndpoint}`;
    const url = `${pythonAiService}${normalizedEndpoint}`;
    await axios.get(url, { timeout: aiWarmupTimeoutMs });
    console.log(`Python AI warm-up succeeded: ${url}`);
  } catch (error) {
    console.warn(`Python AI warm-up failed: ${error.message}`);
  }
};

//Démarrer le serveur après s'être connecté à la base de données
const startServer = async () => {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  await connectDb(mongoUri);
  await ensureProductionSeedData();
  await warmupPythonAI();

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

//Lancer le serveur et gérer les erreurs éventuelles
startServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
