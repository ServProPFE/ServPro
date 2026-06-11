const axios = require("axios");

const normalizeEndpoint = (value) => (value || "").trim().replace(/\/$/, "");

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getFusekiConfig = () => {
  const baseUrl = normalizeEndpoint(process.env.FUSEKI_BASE_URL || "http://localhost:3030");
  const dataset = (process.env.FUSEKI_DATASET || "servpro_db").trim();

  return {
    queryEndpoint: normalizeEndpoint(process.env.FUSEKI_QUERY_ENDPOINT || `${baseUrl}/${dataset}/query`),
    updateEndpoint: normalizeEndpoint(process.env.FUSEKI_UPDATE_ENDPOINT || `${baseUrl}/${dataset}/update`),
    timeoutMs: toPositiveInt(process.env.FUSEKI_TIMEOUT_MS, 30000),
  };
};

const requestFuseki = async ({ endpoint, payload, contentType }) => {
  const response = await axios.post(endpoint, payload, {
    timeout: toPositiveInt(process.env.FUSEKI_TIMEOUT_MS, 30000),
    headers: {
      Accept: "application/sparql-results+json, application/json;q=0.9, text/turtle;q=0.8, */*;q=0.7",
      "Content-Type": contentType,
    },
  });

  return response.data;
};

const runFusekiQuery = async (sparqlQuery) => {
  const { queryEndpoint } = getFusekiConfig();

  if (!queryEndpoint) {
    throw new Error("FUSEKI_QUERY_ENDPOINT is not configured");
  }

  const body = new URLSearchParams();
  body.set("query", sparqlQuery);

  return requestFuseki({
    endpoint: queryEndpoint,
    payload: body.toString(),
    contentType: "application/sparql-query",
  });
};

const runFusekiUpdate = async (sparqlUpdate) => {
  const { updateEndpoint } = getFusekiConfig();

  if (!updateEndpoint) {
    throw new Error("FUSEKI_UPDATE_ENDPOINT is not configured");
  }

  const body = new URLSearchParams();
  body.set("update", sparqlUpdate);

  return requestFuseki({
    endpoint: updateEndpoint,
    payload: body.toString(),
    contentType: "application/sparql-update",
  });
};

module.exports = {
  getFusekiConfig,
  runFusekiQuery,
  runFusekiUpdate,
};