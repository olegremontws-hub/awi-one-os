import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256 } from '../services/document-service/src/integrity.js';
import { findDocumentByHash } from '../services/project-service/src/idempotency.js';

test('document content hash is deterministic', () => {
  const a = sha256(new TextEncoder().encode('same document'));
  const b = sha256(new TextEncoder().encode('same document'));
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test('duplicate lookup is project scoped', async () => {
  const calls: unknown[][] = [];
  const db = { async query(_sql:string, params?:unknown[]) { calls.push(params ?? []); return { rows:[{id:'d1'}] }; } };
  const found = await findDocumentByHash(db, { projectId:'p1', contentSha256:'abc' });
  assert.equal(found?.id, 'd1');
  assert.deepEqual(calls[0], ['p1','abc']);
});
