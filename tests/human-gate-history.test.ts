import test from 'node:test';
import assert from 'node:assert/strict';
import { decideHumanGate } from '../services/project-service/src/human-gate-service.js';
import { getProjectHistory } from '../services/project-service/src/project-history.js';

class Db {
  calls:Array<{sql:string;params?:unknown[]}>=[]; rows:Array<Record<string,unknown>>=[];
  client={
    query:async(sql:string,params?:unknown[])=>{this.calls.push({sql,params});return {rows:this.rows,rowCount:sql.startsWith('update ')?1:this.rows.length};},
    release:()=>{this.calls.push({sql:'RELEASE'});},
  };
  async query(sql:string,params?:unknown[]){this.calls.push({sql,params});return {rows:this.rows,rowCount:this.rows.length};}
  async connect(){return this.client as any;}
}

test('human approval uses pinned transaction and is audited',async()=>{
  const db=new Db();
  const result=await decideHumanGate(db,{projectId:'p1',decisionId:'d1',action:'approve',actorId:'human-1',correlationId:'c1'});
  assert.equal(result.status,'approved');
  assert.equal(db.calls[0]?.sql,'BEGIN');
  assert.equal(db.calls.at(-2)?.sql,'COMMIT');
  assert.equal(db.calls.at(-1)?.sql,'RELEASE');
  assert.equal(db.calls.some(c=>c.params?.includes('HUMAN_GATE_APPROVED')),true);
});

test('human gate rejects empty actor identity',async()=>{
  const db=new Db();
  await assert.rejects(()=>decideHumanGate(db,{projectId:'p1',decisionId:'d1',action:'approve',actorId:'',correlationId:'c1'}),/ACTOR_ID_REQUIRED/);
  assert.equal(db.calls.length,0);
});

test('project history preserves causal audit fields',async()=>{
  const db=new Db(); db.rows=[{id:'e1',event_type:'X',actor_type:'agent',actor_id:'PS-A003',correlation_id:'c1',causation_id:'e0',evidence_refs:['document:d1'],payload:{},occurred_at:'2026-01-01T00:00:00Z'}];
  const history=await getProjectHistory(db,'p1');
  assert.equal(history[0]?.causationId,'e0'); assert.deepEqual(history[0]?.evidenceRefs,['document:d1']);
});

for (const gateLevel of ['H2','H3','H4'] as const) {
  test(`human decision path remains transactional for ${gateLevel}`,async()=>{
    const db=new Db();
    const result=await decideHumanGate(db,{projectId:'p1',decisionId:`d-${gateLevel}`,action:'approve',actorId:'authorized-human',correlationId:`c-${gateLevel}`});
    assert.equal(result.status,'approved');
    assert.equal(db.calls[0]?.sql,'BEGIN');
    assert.equal(db.calls.some(call=>call.sql==='COMMIT'),true);
    assert.equal(db.calls.some(call=>call.params?.includes('authorized-human')),true);
  });
}

test('repeated human decision cannot silently approve twice',async()=>{
  class OnceDb extends Db {
    updates=0;
    client={
      query:async(sql:string,params?:unknown[])=>{
        this.calls.push({sql,params});
        if(sql.startsWith('update decisions')) return {rows:[],rowCount:this.updates++===0?1:0};
        if(sql.startsWith('update human_gates')) return {rows:[],rowCount:1};
        return {rows:[],rowCount:0};
      },
      release:()=>{this.calls.push({sql:'RELEASE'});},
    };
  }
  const db=new OnceDb();
  await decideHumanGate(db,{projectId:'p1',decisionId:'d1',action:'approve',actorId:'human-1',correlationId:'c1'});
  await assert.rejects(()=>decideHumanGate(db,{projectId:'p1',decisionId:'d1',action:'approve',actorId:'human-1',correlationId:'c2'}),/DECISION_NOT_PENDING/);
  assert.equal(db.calls.some(call=>call.sql==='ROLLBACK'),true);
});
