require("dotenv").config();

const { app } = require("../src/app");
const { connectDb } = require("../src/config/db");

let dbConnectionPromise = null;

const ensureDbConnection = async () => {
  const mongoUri = process.env.MONGODB_URI || "";

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  if (!dbConnectionPromise) {
    dbConnectionPromise = connectDb(mongoUri).catch((error) => {
      dbConnectionPromise = null;
      throw error;
    });
  }

  return dbConnectionPromise;
};

module.exports = async (req, res) => {
  try {
    await ensureDbConnection();
    return app(req, res);
  } catch (error) {
    console.error("Vercel handler bootstrap failed:", error);
    return res.status(500).json({
      success: false,
      message: "Server bootstrap failed",
      error: process.env.NODE_ENV === "production" ? undefined : error.message,
    });
  }
};
