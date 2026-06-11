const path = require("node:path");
const fs = require("node:fs/promises");
const { asyncHandler } = require("../utils/asyncHandler");
const { exportOntologySnapshot } = require("../services/ontologyExportService");
const { queryFuseki, updateFuseki, getFusekiConfig } = require("../services/fusekiService");

const exportOntology = asyncHandler(async (req, res) => {
  const turtle = await exportOntologySnapshot();

  if (req.query.download === "true") {
    res.setHeader("Content-Type", "text/turtle; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="servpro-export.ttl"');
  }

  res.type("text/turtle").send(turtle);
});

const writeOntologySnapshot = asyncHandler(async (req, res) => {
  const outputDir = path.join(process.cwd(), "ontology", "generated");
  const outputPath = path.join(outputDir, "servpro-export.ttl");
  const turtle = await exportOntologySnapshot();

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, turtle, "utf8");

  res.json({ message: "Ontology snapshot written", outputPath });
});

const runSparqlQuery = asyncHandler(async (req, res) => {
  const sparql = String(req.body?.query || req.body?.sparql || req.query?.query || "").trim();

  if (!sparql) {
    const error = new Error("SPARQL query is required");
    error.statusCode = 400;
    throw error;
  }

  const data = await queryFuseki(sparql);
  res.json({ data });
});

const runSparqlUpdate = asyncHandler(async (req, res) => {
  const sparql = String(req.body?.update || req.body?.query || req.query?.update || "").trim();

  if (!sparql) {
    const error = new Error("SPARQL update is required");
    error.statusCode = 400;
    throw error;
  }

  const result = await updateFuseki(sparql);
  res.json(result || { message: "SPARQL update sent" });
});

const getOntologyConfig = asyncHandler(async (req, res) => {
  res.json({
    fuseki: getFusekiConfig(),
    resourceBaseIri: process.env.ONTOLOGY_RESOURCE_BASE_IRI || "http://servpro.local/resource/",
  });
});

module.exports = {
  exportOntology,
  writeOntologySnapshot,
  runSparqlQuery,
  runSparqlUpdate,
  getOntologyConfig,
};