import { withTransaction, type TransactionalDb } from './postgres.js';
import type { GateSqlClient } from './human-gate-service.js';

export async function requestDocumentReview(db: GateSqlClient, input: {
  projectId: string; documentId: string; actorId: string; correlationId: string;
}) {
  if (!db.connect) throw new Error('TRANSACTIONAL_DB_REQUIRED');
  if (!input.actorId.trim()) throw new Error('ACTOR_ID_REQUIRED');
  return withTransaction(db as TransactionalDb, async client => {
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [`document-review:${input.projectId}:${input.documentId}`]);
    const document = await client.query(
      'select id,filename from project_documents where project_id=$1 and id=$2 limit 1',
      [input.projectId, input.documentId],
    );
    if (!document.rows?.[0]) throw new Error('DOCUMENT_NOT_FOUND');
    const existing = await client.query(
      "select id,decision_id,status from human_gates where project_id=$1 and payload->>'documentId'=$2 and status='pending' limit 1",
      [input.projectId, input.documentId],
    );
    if (existing.rows?.[0]) return {
      gateId: String(existing.rows[0].id), decisionId: String(existing.rows[0].decision_id), status: 'pending' as const, created: false,
    };
    const decisionId = crypto.randomUUID();
    const gateId = crypto.randomUUID();
    const evidenceRefs = [`document:${input.documentId}`];
    const filename = String(document.rows[0].filename ?? input.documentId);
    await client.query(
      'insert into decisions (id,project_id,title,summary,gate_level,status,evidence_refs) values ($1,$2,$3,$4,$5,$6,$7::jsonb)',
      [decisionId, input.projectId, `Проверка документа: ${filename}`, 'Проверить извлечённые факты, суммы, сроки и обязательства', 'H2', 'pending', JSON.stringify(evidenceRefs)],
    );
    await client.query(
      'insert into human_gates (id,project_id,decision_id,gate_type,gate_level,status,reason,payload) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',
      [gateId, input.projectId, decisionId, 'DOCUMENT_REVIEW', 'H2', 'pending', 'Требуется проверка человеком', JSON.stringify({ documentId: input.documentId, filename })],
    );
    await client.query(
      'insert into audit_events (id,project_id,event_type,actor_type,actor_id,correlation_id,evidence_refs,payload,occurred_at) values (gen_random_uuid(),$1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,now())',
      [input.projectId, 'DOCUMENT_REVIEW_REQUESTED', 'human', input.actorId, input.correlationId, JSON.stringify(evidenceRefs), JSON.stringify({ documentId: input.documentId, decisionId, gateId })],
    );
    return { gateId, decisionId, status: 'pending' as const, created: true };
  });
}
