const path = require("node:path");
const fs = require("node:fs/promises");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { connectDb } = require("../config/db");
const { exportOntologySnapshot } = require("../services/ontologyExportService");

const main = async () => {
  const mongoUri = process.env.MONGODB_URI || "";

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  await connectDb(mongoUri);

  const turtle = await exportOntologySnapshot();
  const outputPath = process.env.ONTOLOGY_EXPORT_PATH
    || path.join(process.cwd(), "ontology", "generated", "servpro-export.ttl");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, turtle, "utf8");

  console.log(`Ontology export written to ${outputPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});