require("dotenv").config();
const serverless = require("serverless-http");
const axios = require("axios");

const { app } = require("../src/app");
const { connectDb } = require("../src/config/db");
const { ensureProductionSeedData } = require("../src/scripts/productionSeed");

const pythonAiService = (process.env.PYTHON_AI_SERVICE || "").replace(/\/$/, "");
const aiWarmupEnabled = String(process.env.PYTHON_AI_WARMUP_ON_START || "false").toLowerCase() === "true";
const aiWarmupEndpoint = process.env.PYTHON_AI_WARMUP_ENDPOINT || "/health";
const aiWarmupTimeoutMs = Number(process.env.PYTHON_AI_WARMUP_TIMEOUT_MS) || 30000;

const lambda = serverless(app);

let dbConnectionPromise = null;
let aiWarmupDone = false;

async function bootstrapIfNeeded() {
  if (dbConnectionPromise) {
    return dbConnectionPromise;
  }

  const mongoUri = process.env.MONGODB_URI || "";
  if (!mongoUri) {
    console.warn("MONGODB_URI not set; requests will fail until configured");
    return null;
  }

  dbConnectionPromise = connectDb(mongoUri).catch((err) => {
    dbConnectionPromise = null;
    throw err;
  });

  // After DB connects, trigger one-time background tasks
  dbConnectionPromise.then(() => {
    // production seed (fire-and-forget)
    ensureProductionSeedData().catch((err) => console.warn("production seed failed:", err?.message));

    // AI warmup (fire-and-forget)
    if (aiWarmupEnabled && pythonAiService && !aiWarmupDone) {
      (async () => {
        try {
          const endpoint = aiWarmupEndpoint.startsWith("/") ? aiWarmupEndpoint : `/${aiWarmupEndpoint}`;
          await axios.get(`${pythonAiService}${endpoint}`, { timeout: aiWarmupTimeoutMs });
          aiWarmupDone = true;
          console.log("Python AI warmup succeeded");
        } catch (err) {
          console.warn("Python AI warmup failed:", err?.message);
        }
      })();
    }
  }).catch((err) => {
    console.error("DB bootstrap failed:", err?.message);
  });

  return dbConnectionPromise;
}

module.exports = async (req, res) => {
  try {
    await bootstrapIfNeeded();
    return lambda(req, res);
  } catch (error) {
    console.error("Vercel handler bootstrap failed:", error);
    res.status(500).json({ success: false, message: "Server bootstrap failed", error: process.env.NODE_ENV === "production" ? undefined : error?.message });
  }
};
