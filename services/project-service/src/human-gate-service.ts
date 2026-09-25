import { withTransaction, type TransactionalDb } from './postgres.js';

export interface GateSqlClient {
  query(sql:string,params?:unknown[]):Promise<{rows?:Array<Record<string,unknown>>;rowCount?:number|null}>;
  connect?:TransactionalDb['connect'];
}

export async function decideHumanGate(db:GateSqlClient,input:{
  projectId:string;decisionId:string;action:'approve'|'reject';actorId:string;note?:string;correlationId:string;
}) {
  if(!db.connect) throw new Error('TRANSACTIONAL_DB_REQUIRED');
  if(!input.actorId.trim()) throw new Error('ACTOR_ID_REQUIRED');
  const status=input.action==='approve'?'approved':'rejected';
  return withTransaction(db as TransactionalDb,async client=>{
    const decisionUpdate=await client.query(
      'update decisions set status=$1, decided_by=$2, decided_at=now() where id=$3 and project_id=$4 and status=$5',
      [status,input.actorId,input.decisionId,input.projectId,'pending'],
    );
    if(decisionUpdate.rowCount===0) throw new Error('DECISION_NOT_PENDING');
    const gateUpdate=await client.query(
      'update human_gates set status=$1, decided_by=$2, decision_note=$3, decided_at=now() where decision_id=$4 and project_id=$5 and status=$6',
      [status,input.actorId,input.note??null,input.decisionId,input.projectId,'pending'],
    );
    if(gateUpdate.rowCount===0) throw new Error('HUMAN_GATE_NOT_PENDING');
    await client.query(
      'insert into audit_events (id,project_id,event_type,actor_type,actor_id,correlation_id,evidence_refs,payload,occurred_at) values (gen_random_uuid(),$1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,now())',
      [input.projectId,status==='approved'?'HUMAN_GATE_APPROVED':'HUMAN_GATE_REJECTED','human',input.actorId,input.correlationId,'[]',JSON.stringify({decisionId:input.decisionId,note:input.note??null})],
    );
    return {decisionId:input.decisionId,status};
  });
}
