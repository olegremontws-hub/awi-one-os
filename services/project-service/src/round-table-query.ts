import type { GateSqlClient } from './human-gate-service.js';
import { buildRoundTableSnapshot } from './round-table-snapshot.js';

function evidenceIds(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function getRoundTableState(db: GateSqlClient, projectId: string) {
  const [decisions, gates, history, documents] = await Promise.all([
    db.query('select id,title,summary,gate_level,status,evidence_refs,created_at from decisions where project_id=$1 order by created_at desc', [projectId]),
    db.query("select id,decision_id,gate_type,gate_level,reason,status,decided_by,decided_at from human_gates where project_id=$1 and status='pending' order by id", [projectId]),
    db.query('select id,event_type,actor_type,actor_id,correlation_id,causation_id,evidence_refs,payload,occurred_at from audit_events where project_id=$1 order by occurred_at desc limit 100', [projectId]),
    db.query('select id,document_kind,processing_status from project_documents where project_id=$1 order by created_at desc', [projectId]),
  ]);

  const gateRows = gates.rows ?? [];
  const historyRows = history.rows ?? [];
  const unified = buildRoundTableSnapshot({
    projectId,
    documents: (documents.rows ?? []).map(row => ({
      id: String(row.id),
      kind: String(row.document_kind ?? 'other'),
      status: String(row.processing_status ?? 'unknown'),
      needsReview: ['failed', 'needs_review'].includes(String(row.processing_status ?? '')),
    })),
    pendingGates: gateRows.map(row => ({
      id: String(row.id),
      kind: String(row.gate_level ?? row.gate_type ?? 'HUMAN_GATE'),
      status: 'PENDING' as const,
      subjectId: String(row.decision_id ?? row.id),
    })),
    risks: [],
    history: historyRows.map(row => ({
      id: String(row.id),
      type: String(row.event_type),
      occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at),
      evidenceIds: evidenceIds(row.evidence_refs),
    })),
  });

  return {
    decisionCards: decisions.rows ?? [],
    pendingHumanActions: gateRows,
    timeline: historyRows,
    ...unified,
  };
}
