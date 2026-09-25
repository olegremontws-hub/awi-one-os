import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { changeProjectStatus } from '../services/project-service/src/project-lifecycle.js';
import { decideHumanGate } from '../services/project-service/src/human-gate-service.js';
import { recoverStuckProcessing } from '../services/document-service/src/recovery.js';

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
