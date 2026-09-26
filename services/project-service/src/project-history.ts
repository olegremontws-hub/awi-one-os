import type { GateSqlClient } from './human-gate-service.js';

export async function getProjectHistory(db: GateSqlClient, projectId: string) {
  const result = await db.query(
    'select id,event_type,actor_type,actor_id,correlation_id,causation_id,evidence_refs,payload,occurred_at from audit_events where project_id=$1 order by occurred_at asc',
    [projectId],
  );
  return (result.rows ?? []).map(row => ({
    eventId: row.id,
    type: row.event_type,
    actor: { type: row.actor_type, id: row.actor_id },
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    evidenceRefs: row.evidence_refs ?? [],
    payload: row.payload ?? {},
    occurredAt: row.occurred_at,
  }));
}
