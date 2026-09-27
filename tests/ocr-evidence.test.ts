import test from 'node:test';
import assert from 'node:assert/strict';
import {persistOcrEvidence} from '../services/project-service/src/ocr-evidence.js';

test('OCR persistence writes document version, page Evidence and causal audit',async()=>{
  const calls:Array<{sql:string;params?:unknown[]}>=[];let evidence=0;
  const db={async query(sql:string,params?:unknown[]){calls.push({sql,params});
    if(sql.includes('insert into document_versions'))return{rows:[{id:'version-1'}]};
    if(sql.includes('insert into evidence'))return{rows:[{id:'e-'+(++evidence)}]};
    return{rows:[]};
  }};
  const result=await persistOcrEvidence(db,{
    projectId:'p1',documentId:'d1',storageKey:'projects/p1/d1.pdf',contentSha256:'abc',correlationId:'11111111-1111-4111-8111-111111111111',
    ocr:{provider:'bridge',pipelineVersion:'v1',pages:[{pageNumber:1,text:'Первая страница',confidence:.9},{pageNumber:2,text:'Вторая страница',confidence:.8}]},
  });
  assert.deepEqual(result,{versionId:'version-1',evidenceIds:['e-1','e-2']});
  assert.equal(calls.filter(x=>x.sql.includes('insert into evidence')).length,2);
  const audit=calls.find(x=>x.sql.includes('DOCUMENT_OCR_EXTRACTED'));
  assert.ok(audit);
  assert.match(String(audit?.params?.[3]),/"pageCount":2/);
  assert.match(String(audit?.params?.[3]),/"meanConfidence":0.85/);
});
