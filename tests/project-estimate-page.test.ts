import test from 'node:test';
import assert from 'node:assert/strict';
import {getProjectEstimatePage} from '../services/project-service/src/project-estimate-page.js';

function db(withEstimate=true){
  return{async query(sql:string){
    if(sql.includes('from projects'))return{rows:[{id:'p1',project_code:'P1',name:'ЖД 3',status:'active'}]};
    if(sql.startsWith('select id,name,estimate_type'))return{rows:withEstimate?[{id:'est1',name:'Baseline',estimate_type:'contractual',currency:'RUB',version:2,status:'approved',created_at:'2026-09-26T18:00:00Z'}]:[]};
    if(sql.includes('from estimate_items'))return{rows:[
      {id:'ei1',work_item_id:'w1',code:'W-001',name:'Монтаж трубопровода',quantity:'120',unit:'м',labor_amount:'120000',material_amount:'480000',equipment_amount:'50000',logistics_amount:'20000',subcontract_amount:null,overhead_amount:'67000',risk_amount:'36850',vat_amount:'154770',total_amount:'928620',price_evidence_ids:['p1','p2'],evidence_ids:['e1']},
      {id:'ei2',work_item_id:'w2',code:'W-002',name:'Колодец',quantity:'4',unit:'шт',labor_amount:'40000',material_amount:'160000',equipment_amount:'20000',logistics_amount:'5000',subcontract_amount:null,overhead_amount:'22500',risk_amount:'12375',vat_amount:'51975',total_amount:'311850',price_evidence_ids:[],evidence_ids:['e2']},
    ]};
    throw new Error('unexpected query '+sql);
  }};
}

test('Estimate Matrix page renders evidence-backed cost rows and totals',async()=>{
  const page=await getProjectEstimatePage(db(),'p1');
  assert.equal(page.status,200);
  assert.match(page.body,/Смета \/ Estimate Matrix/);
  assert.match(page.body,/Монтаж трубопровода/);
  assert.match(page.body,/Колодец/);
  assert.match(page.body,/Price Evidence/);
  assert.match(page.body.replace(/\u00a0/g,' '),/1 240 470/);
  assert.match(page.body,/Human Gate/);
});

test('Estimate Matrix page has explicit empty state before first estimate',async()=>{
  const page=await getProjectEstimatePage(db(false),'p1');
  assert.equal(page.status,200);
  assert.match(page.body,/Смета ещё не сформирована/);
  assert.match(page.body,/нет baseline/);
});
