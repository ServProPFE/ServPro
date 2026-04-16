//Importer les modules nécessaires
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

//Middleware pour authentifier les utilisateurs et vérifier leurs rôles
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "");
    const user = await User.findById(payload.sub).lean();

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = { id: user._id, type: user.type };
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

//Middleware pour autoriser les utilisateurs en fonction de leurs rôles
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!roles.includes(req.user.type)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
};

//Exporter les middlewares d'authentification et d'autorisation
module.exports = { authenticate, authorizeRoles };
