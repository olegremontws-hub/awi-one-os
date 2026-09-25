import type { RequirementsAnalysis } from '../../agent-runtime/src/structured-agent.js';
import type { DecisionCard } from '../../decision-service/src/decision-card.js';
import type { AuditRecord } from '../../audit-service/src/audit.js';
import type { MemoryRecord } from '../../memory-service/src/memory.js';

export type AgentRunRecord = {
  id: string; projectId: string; agentRoleId: 'PS-A003'; status: 'completed';
  correlationId: string; evidenceRefs: string[]; createdAt: string; completedAt: string;
};

export type VS001PersistenceBundle = {
  agentRun: AgentRunRecord;
  decision: DecisionCard;
  memory: MemoryRecord;
  audit: AuditRecord;
};

export interface VS001Repository {
  commit(bundle: VS001PersistenceBundle): Promise<void>;
}

export function createVS001PersistenceBundle(input: {
  projectId: string; correlationId: string; analysis: RequirementsAnalysis;
  decision: DecisionCard; evidenceRefs: string[];
}): VS001PersistenceBundle {
  const now = new Date().toISOString();
  const agentRunId = crypto.randomUUID();
  return {
    agentRun: {
      id: agentRunId, projectId: input.projectId, agentRoleId: 'PS-A003',
      status: 'completed', correlationId: input.correlationId,
      evidenceRefs: input.evidenceRefs, createdAt: now, completedAt: now,
    },
    decision: input.decision,
    memory: {
      memoryId: crypto.randomUUID(), projectId: input.projectId, kind: 'decision',
      content: { decisionId: input.decision.id, summary: input.decision.summary },
      sourceRefs: input.evidenceRefs, version: 1, createdAt: now,
    },
    audit: {
      eventId: crypto.randomUUID(), projectId: input.projectId,
      eventType: 'PROJECT_INTAKE_DECISION_PREPARED', actorType: 'agent', actorId: 'PS-A003',
      correlationId: input.correlationId, evidenceRefs: input.evidenceRefs,
      payload: { agentRunId, decisionId: input.decision.id, gate: input.decision.humanGate.level },
      occurredAt: now,
    },
  };
}

export async function persistVS001(repo: VS001Repository, bundle: VS001PersistenceBundle) {
  await repo.commit(bundle);
  return bundle;
}
