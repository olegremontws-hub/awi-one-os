# VS-002 Release Candidate — Document & Contract Intelligence

Status: **Release Candidate / Draft PR**. Human merge approval is still required.

## Verified scope

The VS-002 branch now implements and tests the evidence-first chain:

`Document → Version → Evidence → Fact → Relation → WorkItem → Estimate → Contract → Change → Acceptance → Invoice → Payment → Generated Document → History / Round Table`.

The current CI gate verifies the committed lockfile, dependency audit, TypeScript typecheck, all migrations, unit/integration tests, migrated PostgreSQL schema, black-box Client QA, and Docker image build.

## Implemented

- Format Registry with explicit distinction between accepted formats and formats that can currently be parsed.
- PDF text extraction with fail-closed `PDF_OCR_REQUIRED` for image-only/scanned PDFs.
- Provider-neutral OCR gateway with provider readiness, page/confidence validation, duplicate page rejection, and bounded result sizes.
- Safe OOXML XLSX ingestion without the vulnerable SheetJS `xlsx` package.
- Bounded ZIP reader with path traversal, encrypted archive, entry size, total size, and compression-ratio defenses.
- Unicode-aware deterministic Russian document classification.
- Page/cell Evidence model and structured fact extraction.
- Contract/document comparison and evidence-required relation validation.
- Deterministic Estimate Matrix / Calculation Engine that refuses to invent missing prices.
- Estimate baseline, contract commitment, approved changes, acceptance, invoice and payment movement model.
- Governed financial POST command with Evidence, ordering checks, idempotency and Human Gate for approved changes.
- AI Document Factory with versioned templates and Human Gate before rendering.
- Built-in DOCX, XLSX and PDF generation, immutable storage keys and SHA-256 artifact hashes.
- Governed generated-document workflow that validates project Evidence and an approved Human Gate, persists the generated artifact/version/run, and writes causal audit history.
- Unified Round Table API and the first server-rendered AWI ONE project screen at `GET /app/projects/:id`.
- Project money aggregation for baseline, commitments, approved changes, accepted, invoiced, paid and remaining amounts.
- Synthetic PostgreSQL integration tests for finance and generated-document flows. Customer documents remain outside CI.

## Public API additions

- `GET /v1/projects/:id/round-table`
- `POST /v1/projects/:id/financial-events`
- `POST /v1/projects/:id/generated-documents`
- `GET /app/projects/:id`

All project routes remain project-scoped by the existing authorization seam.

## Safety and integrity rules

- Missing price evidence stays unverified; no silent AI price invention.
- Verified financial events require Evidence.
- Approved contract changes require an approved Human Gate.
- Invoice total cannot exceed accepted total; payment cannot exceed invoiced total.
- Generated legal/business documents require an approved Human Gate and project Evidence before rendering.
- Generated artifacts are versioned and hashed; prior versions are not overwritten.
- Idempotency conflicts do not silently mutate prior financial or generated-document commands.
- Customer files, credentials and secrets are not committed to the repository.

## Known limitations before production

- No production IdP/JWT verifier yet. The current `x-awi-actor-id` / `x-awi-roles` headers are an integration seam and must not be exposed directly to the public internet.
- No production OCR provider is wired into the upload path yet. Scanned/image-only PDFs fail closed with `PDF_OCR_REQUIRED`; they are not silently treated as analyzed.
- Legacy `.xls`, binary CAD/BIM and several accepted specialist formats are currently store-only until an audited parser/export path is added.
- Built-in DOCX/XLSX/PDF renderers are deterministic MVP renderers, not a substitute for corporate template/layout/signature infrastructure or archival PDF/A validation.
- Electronic signature, external sending, bank actions and protected third-party actions remain Human/External Actions.
- Deployment, production secrets, observability, backup/recovery, load testing and production security review are still separate release requirements.
- Existing failed-extraction records can retain a storage key after the object has been deleted; this lifecycle cleanup remains technical debt.
- Real customer documents are private acceptance inputs and are not repository fixtures.

## Release gate

A VS-002 merge should occur only after:
1. the final branch CI is green;
2. the PR diff and known limitations above are reviewed;
3. explicit human approval is given to move PR #2 out of Draft and merge it.

Do not merge this branch automatically.
