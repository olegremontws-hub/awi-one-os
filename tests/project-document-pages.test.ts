import test from 'node:test';
import assert from 'node:assert/strict';
import {getProjectDocumentsPage,getProjectDocumentAnalysisPage} from '../services/project-service/src/project-document-pages.js';

function listDb(){
  return {async query(sql:string){
    if(sql.includes('from projects'))return{rows:[{id:'p1',project_code:'P1',name:'ЖД 3',status:'active'}]};
    if(sql.startsWith('select id,filename,document_kind'))return{rows:[
      {id:'d1',filename:'contract.pdf',document_kind:'contract',processing_status:'completed',mime_type:'application/pdf',current_version:1,created_at:'2026-09-26T18:00:00Z'},
      {id:'d2',filename:'scan.png',document_kind:'technical_conditions',processing_status:'processing',mime_type:'image/png',current_version:1,created_at:'2026-09-26T18:10:00Z'},
    ]};
    if(sql==='select id,document_id from evidence where project_id=$1')return{rows:[{id:'e1',document_id:'d1'},{id:'e2',document_id:'d1'},{id:'e3',document_id:'d2'}]};
    if(sql==='select id,evidence_ids from extracted_facts where project_id=$1')return{rows:[{id:'f1',evidence_ids:['e1']},{id:'f2',evidence_ids:['e2','e3']}]};
    throw new Error('unexpected query '+sql);
  }};
}

test('Documents page shows registry counts and links to AI analysis',async()=>{
  const page=await getProjectDocumentsPage(listDb(),'p1');
  assert.equal(page.status,200);
  assert.match(page.body,/Документы/);
  assert.match(page.body,/contract\.pdf/);
  assert.match(page.body,/scan\.png/);
  assert.match(page.body,/\/app\/projects\/p1\/documents\/d1/);
  assert.match(page.body,/Evidence/);
  assert.match(page.body,/Извлечено фактов/);
  assert.match(page.body,/id="upload-form"/);
  assert.match(page.body,/fetch\(`\/v1\/projects\/\$\{projectId\}\/documents`/);
});

function detailDb(found=true){
  return {async query(sql:string){
    if(sql.includes('from projects'))return{rows:[{id:'p1',project_code:'P1',name:'ЖД 3',status:'active'}]};
    if(sql.startsWith('select id,filename,document_kind'))return{rows:found?[{id:'d1',filename:'contract.pdf',document_kind:'contract',processing_status:'completed',mime_type:'application/pdf',current_version:2,storage_key:'projects/p1/d1.pdf'}]:[]};
    if(sql.startsWith('select id,page_number'))return{rows:[{id:'e1',page_number:1,sheet_name:null,cell_range:null,quote:'Цена договора 1 000 000 руб.'}]};
    if(sql.startsWith('select id,fact_type'))return{rows:[
      {id:'f1',fact_type:'contract.amount',value:{amount:1000000,currency:'RUB'},unit:'RUB',confidence:'0.98',status:'verified',evidence_ids:['e1']},
      {id:'f2',fact_type:'other',value:'not this doc',unit:null,confidence:'0.8',status:'extracted',evidence_ids:['other-evidence']},
    ]};
    if(sql.startsWith('select id,relation_type'))return{rows:[{id:'r1',relation_type:'supersedes',other_document_id:'d0',direction:'from'}]};
    throw new Error('unexpected query '+sql);
  }};
}

test('Document analysis page shows source Evidence, linked facts and relations',async()=>{
  const page=await getProjectDocumentAnalysisPage(detailDb(),'p1','d1');
  assert.equal(page.status,200);
  assert.match(page.body,/AI-анализ документа/);
  assert.match(page.body,/Цена договора 1 000 000 руб\./);
  assert.match(page.body,/contract\.amount/);
  assert.doesNotMatch(page.body,/not this doc/);
  assert.match(page.body,/supersedes/);
  assert.match(page.body,/Human Review/);
  assert.match(page.body,/id="evidence-e1"/);
  assert.match(page.body,/\/v1\/projects\/p1\/documents\/d1\/download/);
});

test('Document analysis page returns explicit 404 for unknown document',async()=>{
  const page=await getProjectDocumentAnalysisPage(detailDb(false),'p1','missing');
  assert.equal(page.status,404);
  assert.match(page.body,/DOCUMENT_NOT_FOUND/);
});
