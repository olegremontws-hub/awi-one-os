# AWI-ONE-OS Deployment v0.1

## Required runtime services
- PostgreSQL
- LLM provider reachable through the ModelProvider adapter
- S3-compatible object storage for production; local object storage is a development fallback

## Required secrets
Set DATABASE_URL, AWI_LLM_API_KEY and AWI_LLM_MODEL in the deployment environment. Never commit their real values.

## Database
Run `npm run migrate` before starting a new application release. Migrations are applied in filename order and recorded in `schema_migrations`.

## Service
Run `npm run start:project-service` or build the repository Dockerfile.

Health endpoints:
- `GET /health`: process health
- `GET /ready`: verifies PostgreSQL connectivity, object-storage read/write/delete, and configured model-provider readiness

## VS-001 smoke path
1. Create/identify a project.
2. POST a multipart document to `/v1/projects/:projectId/documents`.
3. The service stores the object, extracts supported text, persists the document and runs VS-001.
4. Read `/v1/projects/:projectId/round-table`.
5. If H2/H3/H4 is pending, approve or reject through the decision endpoint.
6. Read `/v1/projects/:projectId/history` for the causal audit trail.

Protected API traffic must terminate behind a trusted identity boundary. The current header-based principal seam is not a production IdP/JWT verifier and must not be exposed directly to untrusted public traffic.

Production credentials belong in the hosting platform's secret manager, not Git or application logs.
