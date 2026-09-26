import type {GateSqlClient} from './human-gate-service.js';
import {getProject} from './project-lifecycle.js';
import {renderProjectHistory} from '../../../apps/round-table/src/history-screen.js';

const ids=(v:unknown)=>Array.isArray(v)?v.map(String):[];

export async function getProjectHistoryPage(db:GateSqlClient,projectId:string){
 const project=await getProject(db,projectId);
 if(!project)return{status:404 as const,body:'<!doctype html><html lang="ru"><meta charset="utf-8"><body>PROJECT_NOT_FOUND</body></html>'};
 const result=await db.query(
  'select id,event_type,actor_type,actor_id,correlation_id,causation_id,evidence_refs,payload,occurred_at from audit_events where project_id=$1 order by occurred_at desc,id desc limit 250',
  [projectId],
 );
 const history=(result.rows??[]).map(row=>({
  id:String(row.id),type:String(row.event_type),actorType:row.actor_type?String(row.actor_type):undefined,actorId:row.actor_id?String(row.actor_id):undefined,
  occurredAt:row.occurred_at instanceof Date?row.occurred_at.toISOString():String(row.occurred_at??''),
  correlationId:row.correlation_id?String(row.correlation_id):undefined,causationId:row.causation_id?String(row.causation_id):undefined,
  evidenceIds:ids(row.evidence_refs),payload:row.payload??{},
 }));
 return{status:200 as const,body:renderProjectHistory({projectId,projectName:String(project.name??projectId),history})};
}
