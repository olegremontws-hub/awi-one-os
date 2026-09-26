# AWI ONE OS

AWI ONE OS is the project operating-system backend for AI-assisted project intake, document processing, round-table analysis, decisions, Human Gates and causal project history.

## Current vertical slice: VS-001 Project Intake

The current implementation provides:

- durable PostgreSQL projects, documents, decisions, Human Gates, execution records and audit/history;
- multipart document upload with SHA-256 idempotency and concurrent duplicate cleanup;
- plain-text extraction and PDF parsing with stable malformed-PDF errors;
- project Round Table intake through a model-provider boundary;
- H2/H3/H4 Human Gate decision persistence with transactional audit;
- project lifecycle transactions and stuck-document recovery;
- object storage through local storage or S3-compatible storage;
- authentication boundary plus RBAC and project-membership scope checks;
- readiness checks for PostgreSQL, object storage and the configured model provider;
- black-box Client QA and Docker build in CI;
- committed npm dependency lockfile enforced with `npm ci`, plus an audit gate for high-severity vulnerabilities.

## Security model

Protected HTTP operations require an authenticated actor outside test/CI runtime. Authorization is split into role permissions (`project:read`, `project:write`, `decision:decide`) and project membership scope.

The repository does **not** yet contain a production identity-provider/JWT verifier. The current header-to-principal boundary is an integration seam for a trusted gateway or future IdP adapter and must not be exposed directly to untrusted public traffic.

The deterministic model provider and synthetic test identity are test/CI mechanisms only.

## Document support

Plain text is supported. PDF extraction is implemented and malformed PDFs fail with a stable extraction error. Positive real-PDF extraction is not yet proven by the CI suite.

XLS/XLSX parsing is deliberately **disabled/fail-closed** as `XLSX_EXTRACTION_UNAVAILABLE`. A previously considered SheetJS dependency was removed because the dependency audit identified high-severity vulnerabilities. Do not re-enable spreadsheet parsing without an audited, maintained parser and hostile-file tests.

Uploads have multipart size enforcement. Extraction failures remove the uploaded object, but a failed extraction that occurs before document-row creation does not yet produce a durable failed-document lifecycle record.

## Runtime configuration

Required:
- `DATABASE_URL`
- `AWI_LLM_API_KEY` and `AWI_LLM_MODEL` for a non-test model provider

Optional:
- `AWI_LLM_BASE_URL`
- `PORT` (default 3001)
- `PG_POOL_MAX`
- `PG_SSL=true`
- `AWI_OBJECT_ROOT` for local object storage
- S3-compatible settings used by the S3 adapter

CI uses `AWI_MODEL_PROVIDER=deterministic-test` with `AWI_ALLOW_TEST_PROVIDER=true`.

## Verification

The pull-request CI performs dependency vulnerability audit, TypeScript checking, PostgreSQL migrations, automated tests, schema verification, black-box Client QA against a running service, and Docker image build.

Useful commands:

```sh
npm ci
npm run typecheck
npm run migrate
npm test
npm run start:project-service
npm run qa:client:http
```

## Known release gaps

This branch is not a production deployment and should not be described as one. Before production exposure it still needs a real identity provider/token verifier and deployment/secret-management configuration. XLSX parsing remains intentionally unavailable. The canonical agent registry in this repository is still a VS-001 subset rather than the full organizational registry.

The feature branch remains the hardening path for VS-001; merge to `main` should happen only after final release verification.
