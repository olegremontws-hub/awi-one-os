import test from 'node:test';
import assert from 'node:assert/strict';
import { getProjectDocumentDownload } from '../services/project-service/src/project-document-download.js';

test('document download is project scoped and keeps storage key private', async () => {
  const calls: unknown[][] = [];
  const db = { async query(_sql: string, params?: unknown[]) { calls.push(params ?? []); return { rows: [{ filename: 'Договор №1.pdf', storage_key: 'private/p1/d1.pdf', mime_type: 'application/pdf' }] }; } };
  const storage = { async get(key: string) { assert.equal(key, 'private/p1/d1.pdf'); return Buffer.from('%PDF'); }, async put() {}, async delete() {} };
  const result = await getProjectDocumentDownload(db, storage, 'p1', 'd1');
  assert.equal(result.status, 200);
  assert.deepEqual(calls[0], ['p1', 'd1']);
  assert.equal(result.headers['content-type'], 'application/pdf');
  assert.match(result.headers['content-disposition'], /filename\*=UTF-8''/);
  assert.doesNotMatch(JSON.stringify(result.headers), /private\/p1/);
  assert.equal(result.body.toString(), '%PDF');
});

test('document download returns 404 before reading storage', async () => {
  let read = false;
  const db = { async query() { return { rows: [] }; } };
  const storage = { async get() { read = true; return new Uint8Array(); }, async put() {}, async delete() {} };
  const result = await getProjectDocumentDownload(db, storage, 'p1', 'missing');
  assert.equal(result.status, 404);
  assert.equal(read, false);
});
