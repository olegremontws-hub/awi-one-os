export interface GateSqlClient {
  query(sql: string, params?: unknown[]): Promise<{ rows?: Array<Record<string, unknown>> }>;
}

export async function decideHumanGate(db: GateSqlClient, input: {
  projectId: string;
  decisionId: string;
  action: 'approve'|'reject';
  actorId: string;
  note?: string;
  correlationId: string;
}) {
  const status = input.action === 'approve' ? 'approved' : 'rejected';
  await db.query('BEGIN');
  try {
    await db.query(
      'update decisions set status=$1, decided_by=$2, decided_at=now() where id=$3 and project_id=$4 and status=$5',
      [status, input.actorId, input.decisionId, input.projectId, 'pending'],
    );
    await db.query(
      'update human_gates set status=$1, decided_by=$2, decision_note=$3, decided_at=now() where decision_id=$4 and project_id=$5 and status=$6',
      [status, input.actorId, input.note ?? null, input.decisionId, input.projectId, 'pending'],
    );
    await db.query(
      'insert into audit_events (id,project_id,event_type,actor_type,actor_id,correlation_id,evidence_refs,payload,occurred_at) values (gen_random_uuid(),$1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,now())',
      [input.projectId, status === 'approved' ? 'HUMAN_GATE_APPROVED' : 'HUMAN_GATE_REJECTED', 'human', input.actorId, input.correlationId, '[]', JSON.stringify({ decisionId: input.decisionId, note: input.note ?? null })],
    );
    await db.query('COMMIT');
    return { decisionId: input.decisionId, status };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
