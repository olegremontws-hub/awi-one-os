import type { VS001PersistenceBundle, VS001Repository } from './vs001-persistence.js';
import { withTransaction, type TransactionalDb } from './postgres.js';

export type SqlClient = TransactionalDb;

export class PostgresVS001Repository implements VS001Repository {
  constructor(private readonly db: SqlClient) {}

  async commit(bundle: VS001PersistenceBundle): Promise<void> {
    await withTransaction(this.db, async db => {
      await db.query(
        'insert into agent_runs (id, project_id, agent_role_id, status, evidence_refs, correlation_id, started_at, completed_at) values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)',
        [bundle.agentRun.id, bundle.agentRun.projectId, bundle.agentRun.agentRoleId, bundle.agentRun.status, JSON.stringify(bundle.agentRun.evidenceRefs), bundle.agentRun.correlationId, bundle.agentRun.createdAt, bundle.agentRun.completedAt],
      );
      await db.query(
        'insert into decisions (id, project_id, title, summary, gate_level, status, evidence_refs) values ($1,$2,$3,$4,$5,$6,$7::jsonb)',
        [bundle.decision.id, bundle.decision.projectId, bundle.decision.title, bundle.decision.summary, bundle.decision.humanGate.level, bundle.decision.humanGate.status, JSON.stringify(bundle.decision.evidenceRefs)],
      );
      if (['H2','H3','H4'].includes(bundle.decision.humanGate.level)) {
        await db.query(
          'insert into human_gates (id,project_id,decision_id,gate_type,gate_level,status,reason,payload) values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7::jsonb)',
          [bundle.decision.projectId,bundle.decision.id,bundle.decision.humanGate.level,bundle.decision.humanGate.level,'pending',bundle.decision.humanGate.reason,JSON.stringify({requestedDecision:bundle.decision.requestedDecision ?? null,evidenceRefs:bundle.decision.evidenceRefs})],
        );
      }
      await db.query(
        'insert into memory_records (id, project_id, kind, content, source_refs, version, created_at) values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7)',
        [bundle.memory.memoryId, bundle.memory.projectId, bundle.memory.kind, JSON.stringify(bundle.memory.content), JSON.stringify(bundle.memory.sourceRefs), bundle.memory.version, bundle.memory.createdAt],
      );
      await db.query(
        'insert into audit_events (id, project_id, event_type, actor_type, actor_id, correlation_id, evidence_refs, payload, occurred_at) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)',
        [bundle.audit.eventId, bundle.audit.projectId, bundle.audit.eventType, bundle.audit.actorType, bundle.audit.actorId, bundle.audit.correlationId, JSON.stringify(bundle.audit.evidenceRefs), JSON.stringify(bundle.audit.payload), bundle.audit.occurredAt],
      );
    });
  }
}
