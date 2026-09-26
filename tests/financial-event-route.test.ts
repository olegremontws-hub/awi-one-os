import test from 'node:test';
import assert from 'node:assert/strict';
import { routeProjectRequest } from '../services/project-service/src/http-routes.js';

class FinancialDb {
  calls: Array<{ sql: string; params?: unknown[] }> = [];
  client = {
    query: async (sql: string, params?: unknown[]) => {
      this.calls.push({ sql, params });
      if (sql.includes('select id,event_type,amount,currency')) return { rows: [] };
      if (sql.includes('select count(*)::int n from evidence')) return { rows: [{ n: 1 }] };
      if (sql.includes('insert into contract_financial_events')) {
        return { rows: [{ id: 'f1', event_type: 'accepted', amount: 1250, currency: 'RUB', occurred_at: '2026-09-26T20:00:00Z' }] };
      }
      return { rows: [] };
    },
    release: () => this.calls.push({ sql: 'RELEASE' }),
  };
  async query() { return { rows: [] }; }
  async connect() { return this.client; }
}

const baseDeps = (db: FinancialDb) => ({
  db: db as never,
  provider: {} as never,
  repository: {} as never,
});

test('financial event HTTP route records evidence-backed movement', async () => {
  const db = new FinancialDb();
  const result = await routeProjectRequest('POST', '/v1/projects/p1/financial-events', {
    eventType: 'accepted',
    amount: 1250,
    currency: 'RUB',
    evidenceIds: ['e1'],
    actorId: 'human-1',
    correlationId: 'c1',
    contractId: 'contract-1',
  }, baseDeps(db));

  assert.equal(result.status, 201);
  assert.equal((result.body as { duplicate: boolean }).duplicate, false);
  assert.equal(db.calls[0]?.sql, 'BEGIN');
  assert.equal(db.calls.some(call => call.sql.includes('insert into contract_financial_events')), true);
  assert.equal(db.calls.some(call => call.params?.includes('FINANCIAL_EVENT_RECORDED')), true);
  assert.equal(db.calls.at(-2)?.sql, 'COMMIT');
  assert.equal(db.calls.at(-1)?.sql, 'RELEASE');
});

test('financial event HTTP route preserves service validation', async () => {
  const db = new FinancialDb();
  await assert.rejects(() => routeProjectRequest('POST', '/v1/projects/p1/financial-events', {
    eventType: 'paid', amount: 0, currency: 'RUB', evidenceIds: ['e1'], actorId: 'human-1',
  }, baseDeps(db)), /INVALID_FINANCIAL_AMOUNT/);
  assert.equal(db.calls.length, 0);
});
