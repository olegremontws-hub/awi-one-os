import type { GateSqlClient } from './human-gate-service.js';

export async function getRoundTableState(db: GateSqlClient, projectId: string) {
  const [decisions, gates, history] = await Promise.all([
    db.query('select id,title,summary,gate_level,status,evidence_refs,created_at from decisions where project_id=$1 order by created_at desc', [projectId]),
    db.query("select id,decision_id,gate_level,reason,status,decided_by,decided_at from human_gates where project_id=$1 and status='pending' order by id", [projectId]),
    db.query('select id,event_type,actor_type,actor_id,correlation_id,causation_id,evidence_refs,payload,occurred_at from audit_events where project_id=$1 order by occurred_at desc limit 100', [projectId]),
  ]);
  return { projectId, decisionCards: decisions.rows ?? [], pendingHumanActions: gates.rows ?? [], timeline: history.rows ?? [] };
}
