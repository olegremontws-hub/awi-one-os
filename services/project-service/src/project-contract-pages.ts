import type {GateSqlClient} from './human-gate-service.js';
import {getProject} from './project-lifecycle.js';
import {renderProjectContracts,renderContractDetail} from '../../../apps/round-table/src/contracts-screen.js';

const arr=(v:unknown)=>Array.isArray(v)?v:[];
const asDate=(v:unknown)=>v instanceof Date?v.toISOString():v?String(v):undefined;
const value=(rows:Array<Record<string,unknown>>,contractId:string,type:string,currency:string)=>rows.filter(r=>String(r.contract_id)===contractId&&String(r.event_type)===type&&String(r.currency)===currency).reduce((s,r)=>s+Number(r.amount??0),0);

export async function getProjectContractsPage(db:GateSqlClient,projectId:string){
 const project=await getProject(db,projectId);
 if(!project)return{status:404 as const,body:'<!doctype html><html lang="ru"><meta charset="utf-8"><body>PROJECT_NOT_FOUND</body></html>'};
 const [contractsResult,itemsResult,eventsResult,obligationsResult]=await Promise.all([
  db.query('select id,document_id,contract_number,contract_date,currency,status,version,created_at from contracts where project_id=$1 order by created_at desc',[projectId]),
  db.query('select ci.contract_id,ci.amount,ci.currency from contract_items ci join contracts c on c.id=ci.contract_id where c.project_id=$1 and ci.amount is not null',[projectId]),
  db.query("select contract_id,event_type,currency,coalesce(sum(amount),0) amount from contract_financial_events where project_id=$1 and status='verified' and contract_id is not null group by contract_id,event_type,currency",[projectId]),
  db.query('select o.contract_id,count(*)::int n from obligations o join contracts c on c.id=o.contract_id where c.project_id=$1 group by o.contract_id',[projectId]),
 ]);
 const eventRows=(eventsResult.rows??[]) as Array<Record<string,unknown>>,itemRows=(itemsResult.rows??[]) as Array<Record<string,unknown>>;
 const obligationCounts=new Map((obligationsResult.rows??[]).map(r=>[String(r.contract_id),Number(r.n??0)]));
 const contracts=(contractsResult.rows??[]).map(row=>{
  const id=String(row.id),currency=String(row.currency??'RUB');
  const committed=itemRows.filter(i=>String(i.contract_id)===id&&String(i.currency)===currency).reduce((s,i)=>s+Number(i.amount??0),0);
  return{id,number:row.contract_number?String(row.contract_number):undefined,date:asDate(row.contract_date),currency,status:String(row.status??'draft'),version:Number(row.version??1),documentId:row.document_id?String(row.document_id):undefined,committed,changes:value(eventRows,id,'approved_change',currency),accepted:value(eventRows,id,'accepted',currency),invoiced:value(eventRows,id,'invoiced',currency),paid:value(eventRows,id,'paid',currency),obligations:obligationCounts.get(id)??0};
 });
 return{status:200 as const,body:renderProjectContracts({projectId,projectName:String(project.name??projectId),contracts})};
}

export async function getProjectContractPage(db:GateSqlClient,projectId:string,contractId:string){
 const project=await getProject(db,projectId);
 if(!project)return{status:404 as const,body:'<!doctype html><html lang="ru"><meta charset="utf-8"><body>PROJECT_NOT_FOUND</body></html>'};
 const contractResult=await db.query('select id,document_id,contract_number,contract_date,currency,status,version,created_at from contracts where project_id=$1 and id=$2 limit 1',[projectId,contractId]);
 const row=contractResult.rows?.[0];
 if(!row)return{status:404 as const,body:'<!doctype html><html lang="ru"><meta charset="utf-8"><body>CONTRACT_NOT_FOUND</body></html>'};
 const [itemsResult,eventsResult,obligationsResult,evidenceResult]=await Promise.all([
  db.query('select id,code,name,quantity,unit,unit_price,amount,currency,evidence_ids from contract_items where contract_id=$1 order by coalesce(code,\'\'),name,id',[contractId]),
  db.query("select event_type,amount,currency,occurred_at,evidence_ids from contract_financial_events where project_id=$1 and contract_id=$2 and status='verified' order by occurred_at desc,id desc",[projectId,contractId]),
  db.query('select id,obligation_type,description,due_at,status,evidence_ids from obligations where contract_id=$1 order by due_at nulls last,id',[contractId]),
  db.query(`select e.id,e.document_id,e.page_number,e.sheet_name,e.cell_range,e.quote,p.filename
   from evidence e join project_documents p on p.id=e.document_id
   where e.project_id=$1 order by e.created_at desc limit 200`,[projectId]),
 ]);
 const currency=String(row.currency??'RUB');
 const eventRows=(eventsResult.rows??[]) as Array<Record<string,unknown>>;
 const sum=(type:string)=>eventRows.filter(e=>String(e.event_type)===type&&String(e.currency)===currency).reduce((s,e)=>s+Number(e.amount??0),0);
 const items=(itemsResult.rows??[]).map(i=>({id:String(i.id),code:i.code?String(i.code):undefined,name:String(i.name??''),quantity:i.quantity===null||i.quantity===undefined?undefined:Number(i.quantity),unit:i.unit?String(i.unit):undefined,unitPrice:i.unit_price===null||i.unit_price===undefined?undefined:Number(i.unit_price),amount:i.amount===null||i.amount===undefined?undefined:Number(i.amount),currency:String(i.currency??currency),evidenceCount:arr(i.evidence_ids).length}));
 const committed=items.filter(i=>i.currency===currency).reduce((s,i)=>s+(i.amount??0),0);
 const contract={id:String(row.id),number:row.contract_number?String(row.contract_number):undefined,date:asDate(row.contract_date),currency,status:String(row.status??'draft'),version:Number(row.version??1),documentId:row.document_id?String(row.document_id):undefined,committed,changes:sum('approved_change'),accepted:sum('accepted'),invoiced:sum('invoiced'),paid:sum('paid'),obligations:(obligationsResult.rows??[]).length};
 const movements=eventRows.map(e=>({type:String(e.event_type),amount:Number(e.amount??0),currency:String(e.currency??currency),occurredAt:asDate(e.occurred_at)??'',evidenceCount:arr(e.evidence_ids).length}));
 const obligations=(obligationsResult.rows??[]).map(o=>({id:String(o.id),type:String(o.obligation_type),description:String(o.description??''),dueAt:asDate(o.due_at),status:String(o.status??'planned'),evidenceCount:arr(o.evidence_ids).length}));
 const evidence=(evidenceResult.rows??[]).map(e=>({id:String(e.id),documentId:String(e.document_id),filename:String(e.filename??''),quote:e.quote?String(e.quote):undefined,location:e.page_number?`стр. ${e.page_number}`:e.sheet_name?`${e.sheet_name}${e.cell_range?' · '+e.cell_range:''}`:'источник'}));
 return{status:200 as const,body:renderContractDetail({projectId,projectName:String(project.name??projectId),contract,items,movements,obligations,evidence})};
}
