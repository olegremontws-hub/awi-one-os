# VS-001 Runbook

## Objective
Prove the first AWI ONE vertical slice from project document upload to durable Round Table state.

## Preconditions
PostgreSQL migrations are current. The service has valid DATABASE_URL, AWI_LLM_API_KEY and AWI_LLM_MODEL. Production storage has AWI_S3_BUCKET configured.

## Expected flow
Document upload -> content hash/idempotency -> object storage -> extraction -> project_documents -> PS-A003 -> Decision Card -> AgentRun/Memory/Audit -> Human Gate when H2/H3/H4 -> Round Table -> causal history.

## Acceptance checks
- Re-uploading identical content in the same project does not start a second AI run.
- Every AI result has evidence references and correlation ID.
- H0 requires no human action.
- H2/H3/H4 creates a pending human gate.
- Approval/rejection is audited.
- Failed processing leaves the document in failed state and records the failure.
- Round Table reads durable state from PostgreSQL.
- No provider or database secrets are committed.

## Recovery
A failed document may be retried only after the cause is resolved. Use correlation IDs and project history to identify the failed run. Never delete audit history to hide or retry an error.
