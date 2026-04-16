//Middleware de gestion des erreurs
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const payload = {
    message: err.message || "Unexpected error",
  };

  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
};

//Exporter le middleware d'erreur
module.exports = { errorHandler };
