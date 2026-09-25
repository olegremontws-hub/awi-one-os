import type { VS001PersistenceBundle, VS001Repository } from './vs001-persistence.js';

export interface SqlClient {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export class PostgresVS001Repository implements VS001Repository {
  constructor(private readonly db: SqlClient) {}

  async commit(bundle: VS001PersistenceBundle): Promise<void> {
    await this.db.query('BEGIN');
    try {
      await this.db.query(
        'insert into agent_runs (id, project_id, agent_role_id, status, evidence_refs, correlation_id, started_at, completed_at) values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8)',
        [bundle.agentRun.id, bundle.agentRun.projectId, bundle.agentRun.agentRoleId, bundle.agentRun.status, JSON.stringify(bundle.agentRun.evidenceRefs), bundle.agentRun.correlationId, bundle.agentRun.createdAt, bundle.agentRun.completedAt],
      );
      await this.db.query(
        'insert into decisions (id, project_id, title, summary, gate_level, status, evidence_refs) values ($1,$2,$3,$4,$5,$6,$7::jsonb)',
        [bundle.decision.id, bundle.decision.projectId, bundle.decision.title, bundle.decision.summary, bundle.decision.humanGate.level, bundle.decision.humanGate.status, JSON.stringify(bundle.decision.evidenceRefs)],
      );
      await this.db.query(
        'insert into memory_records (id, project_id, kind, content, source_refs, version, created_at) values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7)',
        [bundle.memory.memoryId, bundle.memory.projectId, bundle.memory.kind, JSON.stringify(bundle.memory.content), JSON.stringify(bundle.memory.sourceRefs), bundle.memory.version, bundle.memory.createdAt],
      );
      await this.db.query(
        'insert into audit_events (id, project_id, event_type, actor_type, actor_id, correlation_id, evidence_refs, payload, occurred_at) values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)',
        [bundle.audit.eventId, bundle.audit.projectId, bundle.audit.eventType, bundle.audit.actorType, bundle.audit.actorId, bundle.audit.correlationId, JSON.stringify(bundle.audit.evidenceRefs), JSON.stringify(bundle.audit.payload), bundle.audit.occurredAt],
      );
      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }
}
