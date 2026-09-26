import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { changeProjectStatus } from '../services/project-service/src/project-lifecycle.js';
import { decideHumanGate } from '../services/project-service/src/human-gate-service.js';
import { recoverStuckProcessing } from '../services/document-service/src/recovery.js';
import { recordFinancialEvent } from '../services/project-service/src/financial-event-service.js';
import { generateProjectDocument } from '../services/project-service/src/generated-document-service.js';

const url=process.env.DATABASE_URL;
const integration=url?test:test.skip;

integration('postgres project status commits status and audit atomically',async()=>{
  const pool=new pg.Pool({connectionString:url});
  const projectId=crypto.randomUUID(), code='IT-'+projectId.slice(0,8);
  try{
    await pool.query('insert into projects(id,project_code,name,status) values($1,$2,$3,$4)',[projectId,code,'Integration','intake']);
    await changeProjectStatus(pool,{projectId,status:'active',actorId:'integration-human',correlationId:crypto.randomUUID()});
    const p=await pool.query('select status from projects where id=$1',[projectId]);
    const a=await pool.query("select count(*)::int as n from audit_events where project_id=$1 and event_type='PROJECT_STATUS_CHANGED'",[projectId]);
    assert.equal(p.rows[0].status,'active'); assert.equal(a.rows[0].n,1);
  }finally{await pool.query('delete from audit_events where project_id=$1',[projectId]);await pool.query('delete from projects where id=$1',[projectId]);await pool.end();}
});

integration('postgres human gate rolls back decision when gate is missing',async()=>{
  const pool=new pg.Pool({connectionString:url});
  const projectId=crypto.randomUUID(), decisionId=crypto.randomUUID(), code='RB-'+projectId.slice(0,8);
  try{
    await pool.query('insert into projects(id,project_code,name,status) values($1,$2,$3,$4)',[projectId,code,'Rollback','intake']);
    await pool.query("insert into decisions(id,project_id,title,summary,gate_level,status) values($1,$2,'T','S','H3','pending')",[decisionId,projectId]);
    await assert.rejects(()=>decideHumanGate(pool,{projectId,decisionId,action:'approve',actorId:'integration-human',correlationId:crypto.randomUUID()}),/HUMAN_GATE_NOT_PENDING/);
    const d=await pool.query('select status,decided_by from decisions where id=$1',[decisionId]);
    assert.equal(d.rows[0].status,'pending'); assert.equal(d.rows[0].decided_by,null);
  }finally{await pool.query('delete from decisions where id=$1',[decisionId]);await pool.query('delete from projects where id=$1',[projectId]);await pool.end();}
});


integration('postgres recovery commits failed status and audit together',async()=>{
  const pool=new pg.Pool({connectionString:url});
  const projectId=crypto.randomUUID(), documentId=crypto.randomUUID(), code='RC-'+projectId.slice(0,8);
  try{
    await pool.query('insert into projects(id,project_code,name,status) values($1,$2,$3,$4)',[projectId,code,'Recovery','intake']);
    await pool.query("insert into project_documents(id,project_id,filename,storage_key,mime_type,processing_status,created_at,processing_started_at) values($1,$2,'stuck.txt','stuck','text/plain','processing',now()-interval '1 hour',now()-interval '1 hour')",[documentId,projectId]);
    const count=await recoverStuckProcessing(pool,{olderThanMinutes:15});
    assert.equal(count,1);
    const d=await pool.query('select processing_status,failure_reason from project_documents where id=$1',[documentId]);
    const a=await pool.query("select count(*)::int as n from audit_events where project_id=$1 and event_type='DOCUMENT_PROCESSING_RECOVERED'",[projectId]);
    assert.equal(d.rows[0].processing_status,'failed'); assert.equal(d.rows[0].failure_reason,'PROCESSING_TIMEOUT'); assert.equal(a.rows[0].n,1);
  }finally{await pool.query('delete from audit_events where project_id=$1',[projectId]);await pool.query('delete from project_documents where id=$1',[documentId]);await pool.query('delete from projects where id=$1',[projectId]);await pool.end();}
});


for (const gateLevel of ['H2','H3','H4'] as const) {
  integration(`postgres ${gateLevel} human gate commits decision, gate and audit atomically`, async () => {
    const pool=new pg.Pool({connectionString:url});
    const projectId=crypto.randomUUID(), decisionId=crypto.randomUUID(), gateId=crypto.randomUUID(), code=`${gateLevel}-${projectId.slice(0,8)}`;
    const correlationId=crypto.randomUUID();
    try {
      await pool.query('insert into projects(id,project_code,name,status) values($1,$2,$3,$4)',[projectId,code,`Gate ${gateLevel}`,'intake']);
      await pool.query("insert into decisions(id,project_id,title,summary,gate_level,status) values($1,$2,'T','S',$3,'pending')",[decisionId,projectId,gateLevel]);
      await pool.query("insert into human_gates(id,project_id,gate_type,status,payload,decision_id,gate_level,reason) values($1,$2,$3,'pending','{}'::jsonb,$4,$3,'integration')",[gateId,projectId,gateLevel,decisionId]);
      await decideHumanGate(pool,{projectId,decisionId,action:'approve',actorId:'integration-human',correlationId});
      const d=await pool.query('select gate_level,status,decided_by from decisions where id=$1',[decisionId]);
      const g=await pool.query('select gate_level,status,decided_by from human_gates where id=$1',[gateId]);
      const a=await pool.query("select actor_id,correlation_id from audit_events where project_id=$1 and event_type='HUMAN_GATE_APPROVED'",[projectId]);
      assert.deepEqual(d.rows[0],{gate_level:gateLevel,status:'approved',decided_by:'integration-human'});
      assert.deepEqual(g.rows[0],{gate_level:gateLevel,status:'approved',decided_by:'integration-human'});
      assert.equal(a.rows.length,1); assert.equal(a.rows[0].actor_id,'integration-human'); assert.equal(a.rows[0].correlation_id,correlationId);
    } finally {
      await pool.query('delete from audit_events where project_id=$1',[projectId]);
      await pool.query('delete from human_gates where project_id=$1',[projectId]);
      await pool.query('delete from decisions where project_id=$1',[projectId]);
      await pool.query('delete from projects where id=$1',[projectId]);
      await pool.end();
    }
  });
}


integration('postgres financial events enforce evidence, ordering and idempotency',async()=>{
  const pool=new pg.Pool({connectionString:url});
  const projectId=crypto.randomUUID(), documentId=crypto.randomUUID(), evidenceId=crypto.randomUUID(), code='FN-'+projectId.slice(0,8);
  try{
    await pool.query('insert into projects(id,project_code,name,status) values($1,$2,$3,$4)',[projectId,code,'Finance Flow','active']);
    await pool.query("insert into project_documents(id,project_id,filename,storage_key,mime_type,processing_status) values($1,$2,'act.pdf','finance/act.pdf','application/pdf','completed')",[documentId,projectId]);
    await pool.query('insert into evidence(id,project_id,document_id,quote) values($1,$2,$3,$4)',[evidenceId,projectId,documentId,'synthetic acceptance evidence']);
    const base={projectId,currency:'RUB',evidenceIds:[evidenceId],actorId:'integration-human'};
    const accepted=await recordFinancialEvent(pool,{...base,eventType:'accepted',amount:1000,correlationId:crypto.randomUUID()});
    const invoiceCorrelation=crypto.randomUUID();
    const invoiced=await recordFinancialEvent(pool,{...base,eventType:'invoiced',amount:900,correlationId:invoiceCorrelation});
    const duplicate=await recordFinancialEvent(pool,{...base,eventType:'invoiced',amount:900,correlationId:invoiceCorrelation});
    const paid=await recordFinancialEvent(pool,{...base,eventType:'paid',amount:800,correlationId:crypto.randomUUID()});
    assert.equal(accepted.duplicate,false);assert.equal(invoiced.duplicate,false);assert.equal(duplicate.duplicate,true);assert.equal(paid.duplicate,false);
    await assert.rejects(()=>recordFinancialEvent(pool,{...base,eventType:'paid',amount:200,correlationId:crypto.randomUUID()}),/PAID_EXCEEDS_INVOICED/);
    const events=await pool.query('select event_type,count(*)::int n from contract_financial_events where project_id=$1 group by event_type order by event_type',[projectId]);
    assert.deepEqual(events.rows,[{event_type:'accepted',n:1},{event_type:'invoiced',n:1},{event_type:'paid',n:1}]);
    const audit=await pool.query("select count(*)::int n from audit_events where project_id=$1 and event_type='FINANCIAL_EVENT_RECORDED'",[projectId]);
    assert.equal(audit.rows[0].n,3);
  }finally{
    await pool.query('delete from audit_events where project_id=$1',[projectId]);
    await pool.query('delete from contract_financial_events where project_id=$1',[projectId]);
    await pool.query('delete from evidence where project_id=$1',[projectId]);
    await pool.query('delete from project_documents where id=$1',[documentId]);
    await pool.query('delete from projects where id=$1',[projectId]);
    await pool.end();
  }
});


integration('postgres generated document flow links Human Gate Evidence artifact version and history',async()=>{
  const pool=new pg.Pool({connectionString:url});
  const projectId=crypto.randomUUID(), sourceDocumentId=crypto.randomUUID(), evidenceId=crypto.randomUUID(), gateId=crypto.randomUUID(), code='GD-'+projectId.slice(0,8);
  const objects=new Map<string,Uint8Array>();
  const storage={
    async put(key:string,bytes:Uint8Array){objects.set(key,bytes);},
    async get(key:string){const value=objects.get(key);if(!value)throw new Error('NOT_FOUND');return value;},
    async delete(key:string){objects.delete(key);},
  };
  try{
    await pool.query('insert into projects(id,project_code,name,status) values($1,$2,$3,$4)',[projectId,code,'Generated Document','active']);
    await pool.query("insert into project_documents(id,project_id,filename,storage_key,mime_type,processing_status) values($1,$2,'source.txt','source/source.txt','text/plain','completed')",[sourceDocumentId,projectId]);
    await pool.query('insert into evidence(id,project_id,document_id,quote) values($1,$2,$3,$4)',[evidenceId,projectId,sourceDocumentId,'synthetic evidence']);
    await pool.query("insert into human_gates(id,project_id,gate_type,status,payload,gate_level,reason,decided_by,decided_at) values($1,$2,'H3','approved','{}'::jsonb,'H3','synthetic generation approval','integration-human',now())",[gateId,projectId]);
    const correlationId=crypto.randomUUID();
    const input={projectId,kind:'contract' as const,format:'docx' as const,humanGateId:gateId,actorId:'integration-human',correlationId,fields:[
      {key:'contract.number',value:'TEST-1',evidenceIds:[evidenceId]},
      {key:'parties',value:'Synthetic A / Synthetic B',evidenceIds:[evidenceId]},
      {key:'subject',value:'Synthetic scope',evidenceIds:[evidenceId]},
      {key:'amount',value:1000,evidenceIds:[evidenceId]},
      {key:'currency',value:'RUB',evidenceIds:[evidenceId]},
    ]};
    const generated=await generateProjectDocument(pool,storage,input);
    assert.equal(generated.duplicate,false);
    assert.ok(generated.storageKey.endsWith('.docx'));
    assert.ok((await storage.get(generated.storageKey)).byteLength>100);
    const replay=await generateProjectDocument(pool,storage,input);
    assert.equal(replay.duplicate,true);
    const doc=await pool.query('select processing_status,document_kind,current_version from project_documents where id=$1',[generated.documentId]);
    assert.deepEqual(doc.rows[0],{processing_status:'completed',document_kind:'contract',current_version:1});
    const version=await pool.query('select version,sha256,extraction_method from document_versions where document_id=$1',[generated.documentId]);
    assert.equal(version.rows[0].version,1);assert.equal(version.rows[0].sha256.length,64);assert.equal(version.rows[0].extraction_method,'generated');
    const run=await pool.query('select template_id,render_format,human_gate_id,source_evidence_ids from generated_document_runs where document_id=$1',[generated.documentId]);
    assert.equal(run.rows[0].template_id,'contract-v1');assert.equal(run.rows[0].render_format,'docx');assert.equal(run.rows[0].human_gate_id,gateId);assert.deepEqual(run.rows[0].source_evidence_ids,[evidenceId]);
    const audit=await pool.query("select evidence_refs,payload from audit_events where project_id=$1 and event_type='GENERATED_DOCUMENT_RENDERED'",[projectId]);
    assert.equal(audit.rows.length,1);assert.deepEqual(audit.rows[0].evidence_refs,[evidenceId]);assert.equal(audit.rows[0].payload.documentId,generated.documentId);
  }finally{
    await pool.query('delete from audit_events where project_id=$1',[projectId]);
    await pool.query('delete from generated_document_runs where project_id=$1',[projectId]);
    await pool.query("delete from document_versions where document_id in (select id from project_documents where project_id=$1)",[projectId]);
    await pool.query('delete from evidence where project_id=$1',[projectId]);
    await pool.query('delete from human_gates where project_id=$1',[projectId]);
    await pool.query('delete from project_documents where project_id=$1',[projectId]);
    await pool.query('delete from projects where id=$1',[projectId]);
    await pool.end();
  }
});
