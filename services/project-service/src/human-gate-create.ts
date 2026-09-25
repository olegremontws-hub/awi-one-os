import type { GateSqlClient } from './human-gate-service.js';
import type { DecisionCard } from '../../decision-service/src/decision-card.js';

export async function createHumanGateIfRequired(db: GateSqlClient, card: DecisionCard) {
  if (!['H2','H3','H4'].includes(card.humanGate.level)) return null;
  const id = crypto.randomUUID();
  await db.query(
    'insert into human_gates (id,project_id,decision_id,gate_type,gate_level,status,reason,payload) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',
    [id, card.projectId, card.id, card.humanGate.level, card.humanGate.level, 'pending', card.humanGate.reason, JSON.stringify({ requestedDecision: card.requestedDecision ?? null, evidenceRefs: card.evidenceRefs })],
  );
  return { id, decisionId: card.id, level: card.humanGate.level, status: 'pending' as const };
}
