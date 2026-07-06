import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';
import { filterServicesBySearch } from '../utils/serviceSearch';

const escapeSparqlLiteral = (value) => String(value || '')
  .replaceAll('\\', '\\\\')
  .replaceAll('"', String.raw`\"`)
  .replaceAll('\r', ' ')
  .replaceAll('\n', ' ')
  .trim();

const buildOntologySearchQuery = ({ searchTerm = '', category = 'ALL', limit = 100 }) => {
  const term = escapeSparqlLiteral(searchTerm);
  const categoryFilter = category && category !== 'ALL'
    ? `FILTER(STR(?category) = "${escapeSparqlLiteral(category)}")`
    : '';
  const textFilter = term
    ? `FILTER(
      CONTAINS(LCASE(STR(?serviceName)), LCASE("${term}")) ||
      CONTAINS(LCASE(STR(?category)), LCASE("${term}")) ||
      CONTAINS(LCASE(STR(?providerName)), LCASE("${term}")) ||
      (BOUND(?description) && CONTAINS(LCASE(STR(?description)), LCASE("${term}")))
    )`
    : '';

  return `
PREFIX : <http://servpro.local/ontology#>

SELECT ?service ?serviceName ?category ?providerName ?description ?priceMin ?duration
WHERE {
  ?service a :Service ;
           :name ?serviceName ;
           :category ?category ;
           :hasProvider ?provider .
  ?provider :name ?providerName .
  OPTIONAL { ?service :description ?description . }
  OPTIONAL { ?service :priceMin ?priceMin . }
  OPTIONAL { ?service :duration ?duration . }
  ${categoryFilter}
  ${textFilter}
}
ORDER BY LCASE(STR(?serviceName))
LIMIT ${Math.max(1, Number(limit) || 100)}
`.trim();
};

const getBindingValue = (binding, key) => binding?.[key]?.value;

const getResourceId = (value) => {
  if (!value) {
    return null;
  }

  const normalized = String(value).replace(/\/$/, '');
  const parts = normalized.split(/[/#!]/).filter(Boolean);
  return parts.at(-1) || null;
};

const extractOntologyServiceIds = (payload) => {
  const bindings = payload?.data?.results?.bindings
    || payload?.results?.bindings
    || payload?.data?.bindings
    || [];

  return bindings
    .map((binding) => getResourceId(getBindingValue(binding, 'service')))
    .filter(Boolean);
};

const mergeOntologyResultsWithLocalServices = ({ services, orderedIds, searchTerm, category, t }) => {
  const serviceMap = new Map((services || []).map((service) => [String(service._id), service]));
  const orderedServices = orderedIds
    .map((id) => serviceMap.get(String(id)))
    .filter(Boolean);

  if (orderedServices.length === 0) {
    return filterServicesBySearch({ services, searchTerm, category, t });
  }

  const orderedIdSet = new Set(orderedServices.map((service) => String(service._id)));
  const fallback = filterServicesBySearch({ services, searchTerm, category, t });
  const remaining = fallback.filter((service) => !orderedIdSet.has(String(service._id)));

  return [...orderedServices, ...remaining];
};

export const searchServicesWithOntology = async ({ services, searchTerm = '', category = 'ALL', t, limit = 100 }) => {
  const normalizedSearch = String(searchTerm || '').trim();
  const normalizedCategory = category || 'ALL';

  if (!normalizedSearch && normalizedCategory === 'ALL') {
    return filterServicesBySearch({ services, searchTerm, category, t });
  }

  try {
    // Use public semantic search endpoint instead of protected ontology endpoint
    let payload;
    if (normalizedSearch) {
      const searchUrl = normalizedCategory && normalizedCategory !== 'ALL'
        ? `${API_ENDPOINTS.SERVICES_SEMANTIC_SEARCH(normalizedSearch)}&category=${encodeURIComponent(normalizedCategory)}`
        : API_ENDPOINTS.SERVICES_SEMANTIC_SEARCH(normalizedSearch);
      
      const response = await apiService.get(searchUrl);
      // Transform response to match ontology format
      payload = {
        data: {
          results: {
            bindings: (response.items || []).map((item) => ({
              service: { value: item._id },
              serviceName: { value: item.name },
              category: { value: item.category },
              providerName: { value: item.provider },
              description: item.description ? { value: item.description } : undefined,
              priceMin: item.priceMin ? { value: item.priceMin } : undefined,
              duration: item.duration ? { value: item.duration } : undefined,
            }))
          }
        }
      };
    } else {
      payload = { data: { results: { bindings: [] } } };
    }
    
    const orderedIds = extractOntologyServiceIds(payload);

    return mergeOntologyResultsWithLocalServices({
      services,
      orderedIds,
      searchTerm: normalizedSearch,
      category: normalizedCategory,
      t,
    });
  } catch (error) {
    console.warn('Semantic search error, falling back to local filtering:', error.message);
    return filterServicesBySearch({ services, searchTerm: normalizedSearch, category: normalizedCategory, t });
  }
};

export const buildOntologySearchQueryForDebug = buildOntologySearchQuery;