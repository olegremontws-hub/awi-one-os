import test from 'node:test';
import assert from 'node:assert/strict';
import {getProjectHistoryPage} from '../services/project-service/src/project-history-page.js';

function db(found=true){
 return{async query(sql:string){
  if(sql.includes('from projects'))return{rows:found?[{id:'p1',project_code:'P1',name:'ЖД 3',status:'active'}]:[]};
  if(sql.startsWith('select id,event_type'))return{rows:[
   {id:'e1',event_type:'DOCUMENT_OCR_EXTRACTED',actor_type:'system',actor_id:'document-service',correlation_id:'11111111-1111-4111-8111-111111111111',causation_id:null,evidence_refs:['ev1','ev2'],payload:{documentId:'d1',pageCount:2},occurred_at:'2026-09-26T18:40:00Z'},
   {id:'e2',event_type:'FINANCIAL_EVENT_RECORDED',actor_type:'human',actor_id:'user-1',correlation_id:'22222222-2222-4222-8222-222222222222',causation_id:'11111111-1111-4111-8111-111111111111',evidence_refs:['ev3'],payload:{eventType:'paid',amount:1000},occurred_at:'2026-09-26T18:45:00Z'},
  ]};
  if(sql.startsWith('select id,document_id from evidence'))return{rows:[{id:'ev1',document_id:'d1'},{id:'ev3',document_id:'d3'}]};
  throw new Error('unexpected query '+sql);
 }};
}

test('History page renders causal correlation chain and Evidence references',async()=>{
 const page=await getProjectHistoryPage(db(),'p1');
 assert.equal(page.status,200);
 assert.match(page.body,/История \/ Evidence/);
 assert.match(page.body,/DOCUMENT_OCR_EXTRACTED/);
 assert.match(page.body,/FINANCIAL_EVENT_RECORDED/);
 assert.match(page.body,/correlation 22222222/);
 assert.match(page.body,/causation 11111111/);
 assert.match(page.body,/Evidence ev3/);
 assert.match(page.body,/documents\/d3#evidence-ev3/);
 assert.match(page.body,/Human \/ AI/);
});

test('History page returns explicit 404 for unknown project',async()=>{
 const page=await getProjectHistoryPage(db(false),'missing');
 assert.equal(page.status,404);
 assert.match(page.body,/PROJECT_NOT_FOUND/);
});
