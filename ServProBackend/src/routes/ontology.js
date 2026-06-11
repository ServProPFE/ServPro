const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const {
  exportOntology,
  writeOntologySnapshot,
  runSparqlQuery,
  runSparqlUpdate,
  getOntologyConfig,
} = require("../controllers/ontologyController");

const router = express.Router();

router.get("/config", authenticate, authorizeRoles("ADMIN", "PROVIDER"), getOntologyConfig);
router.get("/export", authenticate, authorizeRoles("ADMIN", "PROVIDER"), exportOntology);
router.post("/export", authenticate, authorizeRoles("ADMIN", "PROVIDER"), writeOntologySnapshot);
router.post("/query", authenticate, authorizeRoles("ADMIN", "PROVIDER"), runSparqlQuery);
router.post("/update", authenticate, authorizeRoles("ADMIN", "PROVIDER"), runSparqlUpdate);

module.exports = router;