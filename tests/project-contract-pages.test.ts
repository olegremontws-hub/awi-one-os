import test from 'node:test';
import assert from 'node:assert/strict';
import {getProjectContractsPage,getProjectContractPage} from '../services/project-service/src/project-contract-pages.js';

const project={id:'p1',project_code:'P1',name:'ЖД 3',status:'active'};
function listDb(){
 return{async query(sql:string){
  if(sql.includes('from projects'))return{rows:[project]};
  if(sql.startsWith('select id,document_id,contract_number'))return{rows:[{id:'c1',document_id:'d1',contract_number:'38-23МГС',contract_date:'2023-05-16',currency:'RUB',status:'active',version:1,created_at:'2026-09-26'}]};
  if(sql.includes('from contract_items ci join contracts'))return{rows:[{contract_id:'c1',amount:'18829880',currency:'RUB'}]};
  if(sql.includes('from contract_financial_events'))return{rows:[{contract_id:'c1',event_type:'approved_change',currency:'RUB',amount:'1000000'},{contract_id:'c1',event_type:'accepted',currency:'RUB',amount:'12000000'},{contract_id:'c1',event_type:'invoiced',currency:'RUB',amount:'10000000'},{contract_id:'c1',event_type:'paid',currency:'RUB',amount:'8000000'}]};
  if(sql.includes('count(*)::int n from obligations'))return{rows:[{contract_id:'c1',n:3}]};
  throw new Error('unexpected query '+sql);
 }};
}

test('Contracts registry renders commitments changes payments and movement link',async()=>{
 const page=await getProjectContractsPage(listDb(),'p1');
 assert.equal(page.status,200);
 const body=page.body.replace(/\u00a0/g,' ');
 assert.match(body,/38-23МГС/);
 assert.match(body,/18 829 880/);
 assert.match(body,/1 000 000/);
 assert.match(body,/8 000 000/);
 assert.match(body,/\/app\/projects\/p1\/contracts\/c1/);
});

function detailDb(found=true){
 return{async query(sql:string){
  if(sql.includes('from projects'))return{rows:[project]};
  if(sql.startsWith('select id,document_id,contract_number'))return{rows:found?[{id:'c1',document_id:'d1',contract_number:'38-23МГС',contract_date:'2023-05-16',currency:'RUB',status:'active',version:1,created_at:'2026-09-26'}]:[]};
  if(sql.startsWith('select id,code,name'))return{rows:[{id:'ci1',code:'A-01',name:'Оборудование',quantity:'2',unit:'шт',unit_price:'500000',amount:'1000000',currency:'RUB',evidence_ids:['e1']}]};
  if(sql.startsWith('select event_type,amount'))return{rows:[{event_type:'accepted',amount:'900000',currency:'RUB',occurred_at:'2026-09-20',evidence_ids:['e2']},{event_type:'invoiced',amount:'800000',currency:'RUB',occurred_at:'2026-09-21',evidence_ids:['e3']},{event_type:'paid',amount:'700000',currency:'RUB',occurred_at:'2026-09-22',evidence_ids:['e4']}]};
  if(sql.startsWith('select id,obligation_type'))return{rows:[{id:'o1',obligation_type:'delivery',description:'Поставить оборудование',due_at:'2026-10-01',status:'planned',evidence_ids:['e5']}]};
  if(sql.includes('from evidence e join project_documents'))return{rows:[{id:'e6',document_id:'d2',filename:'act.pdf',page_number:3,quote:'Работы приняты'}]};
  throw new Error('unexpected query '+sql);
 }};
}

test('Contract detail renders items financial events obligations and Evidence counts',async()=>{
 const page=await getProjectContractPage(detailDb(),'p1','c1');
 assert.equal(page.status,200);
 const body=page.body.replace(/\u00a0/g,' ');
 assert.match(body,/Договор 38-23МГС/);
 assert.match(body,/Оборудование/);
 assert.match(body,/accepted/);
 assert.match(body,/700 000/);
 assert.match(body,/Поставить оборудование/);
 assert.match(body,/1 Evidence/);
 assert.match(body,/Зарегистрировать движение/);
 assert.match(body,/act\.pdf · стр\. 3/);
 assert.match(body,/\/v1\/projects\/\$\{projectId\}\/financial-events/);
 assert.match(body,/contractId/);
});

test('Contract detail returns explicit 404 for unknown contract',async()=>{
 const page=await getProjectContractPage(detailDb(false),'p1','missing');
 assert.equal(page.status,404);
 assert.match(page.body,/CONTRACT_NOT_FOUND/);
});
