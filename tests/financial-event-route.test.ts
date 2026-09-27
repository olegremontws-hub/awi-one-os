import test from 'node:test';
import assert from 'node:assert/strict';
import { routeProjectRequest } from '../services/project-service/src/http-routes.js';

class FinancialDb {
  calls: Array<{ sql: string; params?: unknown[] }> = [];
  client = {
    query: async (sql: string, params?: unknown[]) => {
      this.calls.push({ sql, params });
      if (sql.includes('select id,event_type,amount,currency')) return { rows: [] };
      if (sql.includes('select id,document_id from evidence')) return { rows: [{ id: 'e1', document_id: 'document-1' }] };
      if (sql.includes('select id from contracts')) return { rows: [{ id: 'contract-1' }] };
      if (sql.includes('coalesce(sum(amount),0)')) return { rows: [{ event_type: 'accepted', amount: 2000 }] };
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

test('invoice ordering is checked inside the selected contract', async () => {
  const db = new FinancialDb();
  await routeProjectRequest('POST', '/v1/projects/p1/financial-events', {
    eventType: 'invoiced', amount: 1000, currency: 'RUB', evidenceIds: ['e1'],
    actorId: 'human-1', correlationId: 'c2', contractId: 'contract-1',
  }, baseDeps(db));
  const totals = db.calls.find(call => call.sql.includes('coalesce(sum(amount),0)'));
  assert.match(totals?.sql ?? '', /contract_id=\$3/);
  assert.deepEqual(totals?.params, ['p1', 'RUB', 'contract-1']);
});

test('financial movement rejects a contract outside the project scope', async () => {
  class MissingContractDb extends FinancialDb {
    override client = {
      query: async (sql: string, params?: unknown[]) => {
        this.calls.push({ sql, params });
        if (sql.includes('select id,event_type,amount,currency')) return { rows: [] };
        if (sql.includes('select id,document_id from evidence')) return { rows: [{ id: 'e1', document_id: 'document-1' }] };
        return { rows: [] };
      },
      release: () => this.calls.push({ sql: 'RELEASE' }),
    };
  }
  const db = new MissingContractDb();
  await assert.rejects(() => routeProjectRequest('POST', '/v1/projects/p1/financial-events', {
    eventType: 'accepted', amount: 1000, currency: 'RUB', evidenceIds: ['e1'],
    actorId: 'human-1', correlationId: 'c3', contractId: 'foreign-contract',
  }, baseDeps(db)), /FINANCIAL_CONTRACT_NOT_FOUND/);
  assert.equal(db.calls.some(call => call.sql === 'ROLLBACK'), true);
});

test('financial movement source document must own selected Evidence', async () => {
  const db = new FinancialDb();
  await assert.rejects(() => routeProjectRequest('POST', '/v1/projects/p1/financial-events', {
    eventType: 'accepted', amount: 1000, currency: 'RUB', evidenceIds: ['e1'],
    actorId: 'human-1', correlationId: 'c4', sourceDocumentId: 'foreign-document',
  }, baseDeps(db)), /FINANCIAL_SOURCE_DOCUMENT_MISMATCH/);
  assert.equal(db.calls.some(call => call.sql === 'ROLLBACK'), true);
});
