//Utilitaire pour gérer les erreurs dans les fonctions asynchrones
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

//Exporter l'utilitaire asyncHandler
module.exports = { asyncHandler };
