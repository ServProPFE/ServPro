//Importer los modeles y los utilitarios necesarios
const { Service } = require("../models/Service");
const { asyncHandler } = require("../utils/asyncHandler");
const { runFusekiQuery } = require("../services/fusekiService");

//Semantic Search using SPARQL with fallback to MongoDB text search
const semanticSearch = asyncHandler(async (req, res) => {
  const query = req.query.q || req.body.query || "";
  const category = req.query.category || req.body.category || "";

  if (!query || query.trim().length === 0) {
    return res.json({ items: [] });
  }

  // Trim and sanitize the query to prevent SPARQL injection
  const sanitizedQuery = query.trim().substring(0, 100);
  const sanitizedCategory = category ? String(category).trim().substring(0, 50) : "";

  // Try to use Fuseki SPARQL query if configured
  const fusekiConfigured = !!(process.env.FUSEKI_QUERY_ENDPOINT && process.env.FUSEKI_QUERY_ENDPOINT.trim().length > 0);

  if (fusekiConfigured) {
    try {
      const categoryFilter = sanitizedCategory
        ? `FILTER(STR(?category) = "${sanitizedCategory}")`
        : '';

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
  ${categoryFilter}
  FILTER(
    CONTAINS(LCASE(STR(?serviceName)), LCASE("${sanitizedQuery.replace(/"/g, '\\"')}")) ||
    CONTAINS(LCASE(STR(?category)), LCASE("${sanitizedQuery.replace(/"/g, '\\"')}")) ||
    (BOUND(?description) && CONTAINS(LCASE(STR(?description)), LCASE("${sanitizedQuery.replace(/"/g, '\\"')}")))
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
      const errorMsg = error.response?.status === 403 ? "Fuseki access forbidden" : error.message;
      console.warn(`[SemanticSearch] Fuseki query failed (${error.response?.status || 'unknown'}): ${errorMsg}. Falling back to MongoDB.`);
      // Continue to MongoDB fallback below
    }
  } else {
    console.info("[SemanticSearch] Fuseki not configured. Using MongoDB text search.");
  }

  // Fallback to MongoDB text search
  try {
    const mongoQuery = {
      $or: [
        { name: { $regex: sanitizedQuery, $options: 'i' } },
        { category: { $regex: sanitizedQuery, $options: 'i' } },
        { description: { $regex: sanitizedQuery, $options: 'i' } },
      ]
    };

    // Add category filter if specified
    if (sanitizedCategory) {
      mongoQuery.category = sanitizedCategory;
    }

    const services = await Service.find(mongoQuery).limit(50).lean();
    
    res.json({ items: services });
  } catch (error) {
    console.error("[SemanticSearch] MongoDB search failed:", error.message);
    // Return empty results instead of error
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
