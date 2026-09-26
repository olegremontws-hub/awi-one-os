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

test('conflict-safe document insert returns no row for concurrent duplicate', async () => {
  const { saveProjectDocument } = await import('../services/document-service/src/document-repository.js');
  const db={async query(sql:string){assert.match(sql,/on conflict \(project_id,content_sha256\)/);return {rows:[],rowCount:0};}};
  const inserted=await saveProjectDocument(db,{
    documentId:'d2',projectId:'p1',filename:'a.txt',storageKey:'p1/a.txt',mimeType:'text/plain',
    correlationId:'00000000-0000-0000-0000-000000000001',contentSha256:'abc',
  });
  assert.equal(inserted,null);
});
