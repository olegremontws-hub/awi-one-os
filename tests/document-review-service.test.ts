import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDocumentReview } from '../services/project-service/src/document-review-service.js';

class ReviewDb {
  calls: Array<{sql:string;params?:unknown[]}> = [];
  existing: Record<string,unknown> | undefined;
  document: Record<string,unknown> | undefined = { id: 'd1', filename: 'Договор.pdf' };
  client = {
    query: async (sql:string, params?:unknown[]) => {
      this.calls.push({sql,params});
      if (sql.startsWith('select id,filename')) return {rows:this.document?[this.document]:[]};
      if (sql.startsWith('select id,decision_id,status')) return {rows:this.existing?[this.existing]:[]};
      return {rows:[],rowCount:1};
    },
    release: () => { this.calls.push({sql:'RELEASE'}); },
  };
  async query(){ return {rows:[]}; }
  async connect(){ return this.client as never; }
}

test('document review creates one H2 decision, gate and audit event transactionally',async()=>{
  const db=new ReviewDb();
  const result=await requestDocumentReview(db,{projectId:'p1',documentId:'d1',actorId:'human-1',correlationId:'00000000-0000-4000-8000-000000000001'});
  assert.equal(result.created,true);
  assert.equal(db.calls[0]?.sql,'BEGIN');
  assert.equal(db.calls.some(call=>call.sql.startsWith('insert into decisions')&&call.params?.includes('H2')),true);
  assert.equal(db.calls.some(call=>call.sql.startsWith('insert into human_gates')&&call.params?.includes('DOCUMENT_REVIEW')),true);
  assert.equal(db.calls.some(call=>call.params?.includes('DOCUMENT_REVIEW_REQUESTED')),true);
  assert.equal(db.calls.at(-2)?.sql,'COMMIT');
});

test('repeated document review returns the pending gate without duplication',async()=>{
  const db=new ReviewDb();db.existing={id:'g1',decision_id:'decision-1',status:'pending'};
  const result=await requestDocumentReview(db,{projectId:'p1',documentId:'d1',actorId:'human-1',correlationId:'00000000-0000-4000-8000-000000000002'});
  assert.deepEqual(result,{gateId:'g1',decisionId:'decision-1',status:'pending',created:false});
  assert.equal(db.calls.some(call=>call.sql.startsWith('insert into decisions')),false);
});

test('document review rejects an unknown project document',async()=>{
  const db=new ReviewDb();db.document=undefined;
  await assert.rejects(()=>requestDocumentReview(db,{projectId:'p1',documentId:'missing',actorId:'human-1',correlationId:'00000000-0000-4000-8000-000000000003'}),/DOCUMENT_NOT_FOUND/);
  assert.equal(db.calls.some(call=>call.sql==='ROLLBACK'),true);
});
