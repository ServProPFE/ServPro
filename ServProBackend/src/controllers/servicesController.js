//Importer los modeles y los utilitarios necesarios
const { Service } = require("../models/Service");
const { asyncHandler } = require("../utils/asyncHandler");
const { runFusekiQuery } = require("../services/fusekiService");

//Semantic Search using SPARQL with fallback to MongoDB text search
const semanticSearch = asyncHandler(async (req, res) => {
  const query = req.query.q || req.body.query || "";

  if (!query || query.trim().length === 0) {
    return res.json({ items: [] });
  }

  // Try to use Fuseki SPARQL query if configured
  const useFuseki = process.env.FUSEKI_QUERY_ENDPOINT && process.env.FUSEKI_QUERY_ENDPOINT.trim().length > 0;

  if (useFuseki) {
    try {
      const sparqlQuery = `
PREFIX : <http://servpro.local/ontology#>

SELECT ?service ?serviceName ?description ?category ?providerName
WHERE {
  ?service a :Service ;
           :name ?serviceName ;
           :category ?category ;
           :hasProvider ?provider .
  OPTIONAL { ?service :description ?description . }
  ?provider :name ?providerName .
  FILTER(
    CONTAINS(LCASE(STR(?serviceName)), LCASE("${query.replace(/"/g, '\\"')}")) ||
    CONTAINS(LCASE(STR(?category)), LCASE("${query.replace(/"/g, '\\"')}")) ||
    (BOUND(?description) && CONTAINS(LCASE(STR(?description)), LCASE("${query.replace(/"/g, '\\"')}")))
  )
}
ORDER BY LCASE(STR(?serviceName))
      `;

      const result = await runFusekiQuery(sparqlQuery);
      const items = (result.results?.bindings || []).map((binding) => ({
        _id: binding.service?.value,
        name: binding.serviceName?.value,
        description: binding.description?.value,
        category: binding.category?.value,
        provider: binding.providerName?.value,
      }));
      return res.json({ items });
    } catch (error) {
      console.warn("Fuseki SPARQL query failed, falling back to MongoDB text search:", error.message);
      // Continue to MongoDB fallback below
    }
  }

  // Fallback to MongoDB text search
  try {
    const services = await Service.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ]
    }).lean();
    res.json({ items: services });
  } catch (error) {
    console.error("MongoDB search failed:", error);
    res.json({ items: [] });
  }
});

//Lister los servicios con los filtros opcionales
const listServices = asyncHandler(async (req, res) => {
  const { category, providerId } = req.query;
  const query = {};

  if (category) {
    query.category = category;
  }

  if (providerId) {
    query.provider = providerId;
  }

  const services = await Service.find(query).sort({ createdAt: -1 }).lean();

  res.json({ items: services });
});

//Obtener un servicio por ID
const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).populate('provider', 'name email phone').lean();
  
  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }

  res.json(service);
});

//Crear un nuevo servicio
const createService = asyncHandler(async (req, res) => {
  const {
    provider,
    name,
    category,
    priceMin,
    priceMax,
    duration,
    description,
    currency,
  } = req.body;

  const service = await Service.create({
    provider,
    name,
    category,
    priceMin,
    priceMax,
    duration,
    description,
    currency,
  });

  res.status(201).json(service);
});

//Actualizar un servicio
const updateService = asyncHandler(async (req, res) => {
  const { name, category, priceMin, priceMax, duration, description, currency } = req.body;
    const service = await Service.findById(req.params.id);
    if (!service) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }
    Object.assign(service, {
      name,
      category,
      priceMin,
      priceMax,
      duration,
      description,
      currency: currency || service.currency || "TND",
    });
    await service.save();
    res.json(service);
});

//Eliminar un servicio
const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) {
    const error = new Error("Service not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ message: "Service deleted" });
});

//Exportar las funciones del controlador
module.exports = { listServices, getServiceById, createService, updateService, deleteService, semanticSearch };
