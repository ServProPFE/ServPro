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
    const query = buildOntologySearchQuery({ searchTerm: normalizedSearch, category: normalizedCategory, limit });
    const payload = await apiService.post(API_ENDPOINTS.ONTOLOGY_QUERY, { query });
    const orderedIds = extractOntologyServiceIds(payload);

    return mergeOntologyResultsWithLocalServices({
      services,
      orderedIds,
      searchTerm,
      category,
      t,
    });
  } catch (error) {
    console.warn('Ontology search fallback to local filtering:', error.message);
    return filterServicesBySearch({ services, searchTerm, category, t });
  }
};

export const buildOntologySearchQueryForDebug = buildOntologySearchQuery;