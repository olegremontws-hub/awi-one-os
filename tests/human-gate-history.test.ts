import test from 'node:test';
import assert from 'node:assert/strict';
import { decideHumanGate } from '../services/project-service/src/human-gate-service.js';
import { getProjectHistory } from '../services/project-service/src/project-history.js';

class Db {
  calls: Array<{sql:string; params?:unknown[]}> = [];
  rows: Array<Record<string, unknown>> = [];
  async query(sql:string, params?:unknown[]) { this.calls.push({sql,params}); return { rows: this.rows }; }
}

test('human approval is transactional and audited', async () => {
  const db = new Db();
  const result = await decideHumanGate(db, {
    projectId:'p1', decisionId:'d1', action:'approve', actorId:'human-1', correlationId:'c1',
  });
  assert.equal(result.status, 'approved');
  assert.equal(db.calls[0]?.sql, 'BEGIN');
  assert.equal(db.calls.at(-1)?.sql, 'COMMIT');
  assert.equal(db.calls.some(c => c.sql.includes('HUMAN_GATE_APPROVED') || c.params?.includes('HUMAN_GATE_APPROVED')), true);
});

test('project history preserves causal audit fields', async () => {
  const db = new Db();
  db.rows = [{ id:'e1', event_type:'X', actor_type:'agent', actor_id:'PS-A003', correlation_id:'c1', causation_id:'e0', evidence_refs:['document:d1'], payload:{}, occurred_at:'2026-01-01T00:00:00Z' }];
  const history = await getProjectHistory(db, 'p1');
  assert.equal(history[0]?.causationId, 'e0');
  assert.deepEqual(history[0]?.evidenceRefs, ['document:d1']);
});
