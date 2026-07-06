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
  try {
    const response = await axios.post(endpoint, payload, {
      timeout: toPositiveInt(process.env.FUSEKI_TIMEOUT_MS, 30000),
      headers: {
        Accept: "application/sparql-results+json, application/json;q=0.9, text/turtle;q=0.8, */*;q=0.7",
        "Content-Type": contentType,
      },
      validateStatus: () => true, // Don't throw on any status code; we'll handle it ourselves
    });

    if (!response.status || response.status >= 400) {
      const statusMsg = `${response.status} ${response.statusText}`;
      const errorMsg = response.data?.message || response.data?.error || response.data || "Unknown error";
      throw new Error(`Fuseki request failed with ${statusMsg}: ${errorMsg}`);
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      // Axios error with response
      const status = error.response.status;
      const statusText = error.response.statusText || 'Unknown';
      throw new Error(`Fuseki HTTP ${status} ${statusText}: ${error.message}`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`Fuseki connection refused. Endpoint may not be running: ${endpoint}`);
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error(`Fuseki request timeout after ${toPositiveInt(process.env.FUSEKI_TIMEOUT_MS, 30000)}ms`);
    }
    throw error;
  }
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