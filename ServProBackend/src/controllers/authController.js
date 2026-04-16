//Importer les modules nécessaires
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Importer les fonctions du modèle
const { User } = require("../models/User");
const { asyncHandler } = require("../utils/asyncHandler");

//Fonction pour générer un token JWT
const signToken = (user) => {
  const secret = process.env.JWT_SECRET || "";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign({ sub: user._id, role: user.type }, secret, { expiresIn });
};

//Contrôleur pour l'inscription d'un nouvel utilisateur
const register = asyncHandler(async (req, res) => {
  const { type, name, email, phone, password } = req.body;

  if (!type || !name || !email || !password) {
    const error = new Error("Missing required fields");
    error.statusCode = 400;
    throw error;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ type, name, email, phone, passwordHash });
  const token = signToken(user);

  res.status(201).json({
    token,
    user: { id: user._id, type: user.type, name: user.name, email: user.email },
  });
});

//Contrôleur pour la connexion d'un utilisateur existant
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user._id, type: user.type, name: user.name, email: user.email },
  });
});

// Public endpoint to list all service providers for portfolio browsing
const listProviders = asyncHandler(async (req, res) => {
  const providers = await User.find({ type: "PROVIDER" })
    .select("name email phone providerProfile")
    .sort({ name: 1 })
    .lean();

  res.json({ items: providers });
});

//Exporter les contrôleurs
module.exports = { register, login, listProviders };
