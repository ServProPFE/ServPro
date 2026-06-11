require("dotenv").config();
const axios = require("axios");

const { app } = require("../src/app");
const { connectDb } = require("../src/config/db");
const { ensureProductionSeedData } = require("../src/scripts/productionSeed");

const pythonAiService = (process.env.PYTHON_AI_SERVICE || "").replace(/\/$/, "");
const aiWarmupEnabled = String(process.env.PYTHON_AI_WARMUP_ON_START || "false").toLowerCase() === "true";
const aiWarmupEndpoint = process.env.PYTHON_AI_WARMUP_ENDPOINT || "/health";
const aiWarmupTimeoutMs = Number(process.env.PYTHON_AI_WARMUP_TIMEOUT_MS) || 30000;

const defaultAllowedOrigins = new Set([
  "https://dashboard.servpro.tn",
  "https://app.servpro.tn",
  "https://dashboard.servpro.local",
  "https://app.servpro.local",
  "https://servpro-frontend.vercel.app",
  "https://serv-pro-dashboard.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://servpro--0ptcatldvs.expo.app",
]);

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.trim();
  const isTrustedServproOrigin = /^https:\/\/[a-z0-9-]+\.servpro\.(tn|local)$/i.test(normalizedOrigin);
  const isTrustedVercelOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalizedOrigin);
  const isTrustedLocalhost = /^http:\/\/localhost(?::\d+)?$/i.test(normalizedOrigin);
  const isTrustedExpoApp = /^https:\/\/[a-z0-9-]+\.expo\.app$/i.test(normalizedOrigin);

  return defaultAllowedOrigins.has(normalizedOrigin) || isTrustedServproOrigin || isTrustedVercelOrigin || isTrustedLocalhost || isTrustedExpoApp;
};

const applyCorsHeaders = (req, res) => {
  const origin = req.headers.origin;

  if (!isAllowedOrigin(origin)) {
    return false;
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  return true;
};

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

function handler(req, res) {
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  bootstrapIfNeeded()
    .then(() => app(req, res))
    .catch((error) => {
      console.error("Vercel handler bootstrap failed:", error);
      res.status(500).json({ success: false, message: "Server bootstrap failed", error: process.env.NODE_ENV === "production" ? undefined : error?.message });
    });
}

module.exports = handler;
