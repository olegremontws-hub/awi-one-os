import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverStuckProcessing } from '../services/document-service/src/recovery.js';

test('stuck processing recovery marks timed out documents and audits evidence',async()=>{
  const calls:Array<{sql:string;params?:unknown[]}>=[], rows=[{id:'d1',project_id:'p1'}];
  const db={query:async(sql:string,params?:unknown[])=>{calls.push({sql,params});return {rows:sql.startsWith('update ')?rows:[]};}};
  const count=await recoverStuckProcessing(db,{olderThanMinutes:20});
  assert.equal(count,1);
  assert.equal(calls[0]?.params?.[0],20);
  assert.equal(calls.some(c=>c.sql.includes('DOCUMENT_PROCESSING_RECOVERED')),true);
  assert.equal(calls.some(c=>String(c.params?.[1]).includes('document:d1')),true);
});
