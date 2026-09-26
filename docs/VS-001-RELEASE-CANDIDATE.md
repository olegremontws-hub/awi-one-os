# VS-001 Release Candidate Review

Review baseline: feature branch `feat/vs-001-project-intake`, commit `a0a0e71f66e73cf18a1a76809a51908d04889990`.
This is a review record, not approval for production deployment or automatic merge.

## Verified release gates

GitHub Actions CI run #156 completed successfully on the baseline commit:
- tracked canonical `package-lock.json` and clean `npm ci`;
- `npm audit --audit-level=high`;
- TypeScript typecheck;
- PostgreSQL migrations and automated tests, including database integration tests;
- migrated-schema verification;
- service startup and black-box Client QA;
- Docker image build.

PR #1 was open, Draft, mergeable, and in a clean merge state when this review began.

## VS-001 behavior and scope

- Project/document persistence, SHA-256 duplicate detection, concurrent duplicate cleanup, processing recovery, and transactional audit.
- Document extraction failures now persist a `failed` document row and audit event while removing the uploaded object.
- H2/H3/H4 Human Gates have PostgreSQL integration coverage.
- The API has RBAC and project-membership scope checks; the current header-based principal boundary requires a trusted gateway and is **not** production identity verification.
- `/ready` checks PostgreSQL, object-storage write/read/delete, and model-provider readiness.

## Explicit limitations / non-goals

1. No production IdP/JWT verifier or completed production deployment/secret-management setup. Do not expose protected routes directly to untrusted traffic.
2. Scanned/image-only PDFs require OCR; current `pdf-parse` targets PDFs with an embedded text layer. A successful positive embedded-text PDF CI fixture is still outstanding. The previously attempted handcrafted PDF fixture was invalid and removed.
3. XLS/XLSX extraction remains fail-closed as `XLSX_EXTRACTION_UNAVAILABLE` pending an audited maintained parser and hostile-file tests.
4. The canonical agent registry currently covers the VS-001 subset, not all departmental roles.
5. The uploaded real-world contract is private test material, not a repository or CI fixture.

## Release decision checklist

- [x] Final baseline CI passed (#156).
- [x] Dependency lockfile and audit gates enforced.
- [x] PostgreSQL, black-box Client QA, and Docker gates passed.
- [x] PR is Draft with a clean merge state at review baseline.
- [x] Final PR diff reviewed for scope: 95 files across CI/runtime/database/contracts/services/tests/docs; no customer PDF fixture is included.
- [ ] Obtain explicit human approval before merging to `main`.
- [ ] Complete separate production security/deployment review before public exposure.

## PR diff review

The final review found the change set aligned with the VS-001 vertical slice and its hardening work. The unusually large commit count reflects iterative CI hardening; release evidence is the final tree plus green CI, not individual intermediate commits. PR remains Draft until explicit human merge approval.

## Next engineering slice

Document Intelligence/OCR should add scanned-PDF detection, a bounded OCR worker, per-page evidence references, confidence and extraction-failure states, and synthetic non-sensitive fixtures. Never commit customer contracts as test data.
