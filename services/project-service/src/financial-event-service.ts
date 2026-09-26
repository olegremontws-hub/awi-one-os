import { withTransaction, type TransactionalDb } from './postgres.js';
import type { GateSqlClient } from './human-gate-service.js';

export type FinancialEventType='approved_change'|'accepted'|'invoiced'|'paid';

export type FinancialEventCommand={
  projectId:string;
  eventType:FinancialEventType;
  amount:number;
  currency:string;
  evidenceIds:string[];
  actorId:string;
  correlationId:string;
  humanGateId?:string;
  contractId?:string;
  contractItemId?:string;
  sourceDocumentId?:string;
};

const EVENT_TYPES:readonly FinancialEventType[]=['approved_change','accepted','invoiced','paid'];

export async function recordFinancialEvent(db:GateSqlClient,input:FinancialEventCommand){
  if(!db.connect)throw new Error('TRANSACTIONAL_DB_REQUIRED');
  if(!EVENT_TYPES.includes(input.eventType))throw new Error('INVALID_FINANCIAL_EVENT_TYPE');
  if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('INVALID_FINANCIAL_AMOUNT');
  if(!/^[A-Z]{3}$/.test(input.currency))throw new Error('INVALID_FINANCIAL_CURRENCY');
  if(!input.actorId.trim())throw new Error('ACTOR_ID_REQUIRED');
  if(!input.correlationId.trim())throw new Error('CORRELATION_ID_REQUIRED');
  if(!input.evidenceIds.length)throw new Error('FINANCIAL_EVIDENCE_REQUIRED');
  if(input.eventType==='approved_change'&&!input.humanGateId)throw new Error('HUMAN_GATE_APPROVAL_REQUIRED');

  return withTransaction(db as TransactionalDb,async client=>{
    const duplicate=await client.query(
      'select id,event_type,amount,currency from contract_financial_events where project_id=$1 and correlation_id=$2 limit 1',
      [input.projectId,input.correlationId],
    );
    if((duplicate.rows??[]).length)return{...(duplicate.rows![0]),duplicate:true};

    const evidence=await client.query(
      'select count(*)::int n from evidence where project_id=$1 and id = any($2::uuid[])',
      [input.projectId,input.evidenceIds],
    );
    if(Number(evidence.rows?.[0]?.n??0)!==new Set(input.evidenceIds).size)throw new Error('FINANCIAL_EVIDENCE_NOT_FOUND');

    if(input.eventType==='approved_change'){
      const gate=await client.query(
        "select id from human_gates where id=$1 and project_id=$2 and status='approved' limit 1",
        [input.humanGateId,input.projectId],
      );
      if(!(gate.rows??[]).length)throw new Error('HUMAN_GATE_APPROVAL_REQUIRED');
    }

    if(input.eventType==='invoiced'||input.eventType==='paid'){
      const totals=await client.query(
        "select event_type,coalesce(sum(amount),0) amount from contract_financial_events where project_id=$1 and currency=$2 and status='verified' and event_type in ('accepted','invoiced','paid') group by event_type",
        [input.projectId,input.currency],
      );
      const total=(kind:FinancialEventType)=>Number((totals.rows??[]).find(r=>r.event_type===kind)?.amount??0);
      if(input.eventType==='invoiced'&&total('invoiced')+input.amount>total('accepted'))throw new Error('INVOICED_EXCEEDS_ACCEPTED');
      if(input.eventType==='paid'&&total('paid')+input.amount>total('invoiced'))throw new Error('PAID_EXCEEDS_INVOICED');
    }

    const inserted=await client.query(
      `insert into contract_financial_events
       (project_id,contract_id,contract_item_id,event_type,amount,currency,source_document_id,evidence_ids,human_gate_id,status,correlation_id,actor_id)
       values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'verified',$10,$11)
       returning id,event_type,amount,currency,occurred_at`,
      [input.projectId,input.contractId??null,input.contractItemId??null,input.eventType,input.amount,input.currency,input.sourceDocumentId??null,JSON.stringify([...new Set(input.evidenceIds)]),input.humanGateId??null,input.correlationId,input.actorId],
    );
    const row=inserted.rows?.[0];
    await client.query(
      'insert into audit_events (id,project_id,event_type,actor_type,actor_id,correlation_id,evidence_refs,payload,occurred_at) values (gen_random_uuid(),$1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,now())',
      [input.projectId,'FINANCIAL_EVENT_RECORDED','human',input.actorId,input.correlationId,JSON.stringify(input.evidenceIds),JSON.stringify({financialEventId:row?.id,eventType:input.eventType,amount:input.amount,currency:input.currency})],
    );
    return{...row,duplicate:false};
  });
}
