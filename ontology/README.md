# ServPro Ontology and Fuseki

This folder contains a project-specific ontology extracted from the ServPro backend domain model.

## Files

- `ServProOntology.ttl`: OWL/Turtle ontology for services, providers, bookings, offers, reviews, portfolios, certifications, competences, availability, transactions, notifications, tracking, and packages.
- `sample-data.ttl`: Small example graph that can be loaded directly into Fuseki.
- `queries/*.rq`: SPARQL query examples for Fuseki.

## Fuseki setup

1. Install Apache Jena Fuseki.
2. Create a dataset, for example `servpro`.
3. Upload `ServProOntology.ttl` into the dataset or load it via the Fuseki upload endpoint.
4. Store your endpoint in the frontend/backend environment, for example:

```env
FUSEKI_BASE_URL=http://localhost:3030
FUSEKI_DATASET=servpro
FUSEKI_QUERY_ENDPOINT=http://localhost:3030/servpro/query
FUSEKI_UPDATE_ENDPOINT=http://localhost:3030/servpro/update
```

## SPARQL examples

Run the query files in `queries/` against the dataset.

Example endpoints:

- Query: `GET/POST http://localhost:3030/servpro/query`
- Update: `POST http://localhost:3030/servpro/update`

## Notes

- The ontology follows the current ServPro domain objects from the backend models.
- It is a starting point for semantic search, provider discovery, and booking analytics.
- The backend export script writes Turtle snapshots to `ontology/generated/servpro-export.ttl`.
