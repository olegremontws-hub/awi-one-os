import test from 'node:test';
import assert from 'node:assert/strict';
import { PostgresVS001Repository, type SqlClient } from '../services/project-service/src/postgres-vs001-repository.js';
import { buildVS001Decision } from '../services/project-service/src/vs001-result.js';
import { createVS001PersistenceBundle } from '../services/project-service/src/vs001-persistence.js';

class RecordingDb implements SqlClient {
  calls: string[] = [];
  async query(sql: string): Promise<unknown> { this.calls.push(sql); return {}; }
}

test('PostgreSQL repository commits VS-001 records in one transaction', async () => {
  const db = new RecordingDb();
  const decision = buildVS001Decision({
    projectId: '00000000-0000-0000-0000-000000000001',
    evidenceRefs: ['document:doc-1'],
    analysis: { projectSummary: 'Intake', requirements: [], missingInformation: [], risks: [], assumptions: [], confidence: 1 },
  });
  const bundle = createVS001PersistenceBundle({
    projectId: decision.projectId,
    correlationId: '00000000-0000-0000-0000-000000000002',
    analysis: { projectSummary: 'Intake', requirements: [], missingInformation: [], risks: [], assumptions: [], confidence: 1 },
    decision,
    evidenceRefs: ['document:doc-1'],
  });
  await new PostgresVS001Repository(db).commit(bundle);
  assert.equal(db.calls[0], 'BEGIN');
  assert.equal(db.calls.at(-1), 'COMMIT');
  assert.equal(db.calls.some(x => x.includes('insert into agent_runs')), true);
  assert.equal(db.calls.some(x => x.includes('insert into decisions')), true);
  assert.equal(db.calls.some(x => x.includes('insert into memory_records')), true);
  assert.equal(db.calls.some(x => x.includes('insert into audit_events')), true);
});
