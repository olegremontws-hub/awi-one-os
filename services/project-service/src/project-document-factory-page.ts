import type {GateSqlClient} from './human-gate-service.js';
import {getProject} from './project-lifecycle.js';
import {listTemplates} from '../../document-service/src/document-templates.js';
import {renderDocumentFactory} from '../../../apps/round-table/src/document-factory-screen.js';
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const date=(v:unknown)=>v instanceof Date?v.toISOString():String(v??'');
export async function getProjectDocumentFactoryPage(db:GateSqlClient,projectId:string){
 const project=await getProject(db,projectId);
 if(!project)return{status:404 as const,body:'<!doctype html><html lang="ru"><meta charset="utf-8"><body>PROJECT_NOT_FOUND</body></html>'};
 const [runsResult,gatesResult,evidenceResult]=await Promise.all([
  db.query(`select r.document_id,p.filename,p.document_kind,r.template_id,r.template_version,r.render_format,r.source_evidence_ids,r.created_at
   from generated_document_runs r join project_documents p on p.id=r.document_id
   where r.project_id=$1 order by r.created_at desc limit 50`,[projectId]),
  db.query("select id,coalesce(gate_level,gate_type) level,reason,decided_at from human_gates where project_id=$1 and status='approved' order by decided_at desc nulls last,id",[projectId]),
  db.query(`select e.id,e.document_id,e.page_number,e.sheet_name,e.cell_range,e.quote,p.filename
   from evidence e join project_documents p on p.id=e.document_id
   where e.project_id=$1 order by e.created_at desc limit 200`,[projectId]),
 ]);
 const runs=(runsResult.rows??[]).map(r=>({documentId:String(r.document_id),filename:String(r.filename),kind:String(r.document_kind??''),templateId:String(r.template_id),templateVersion:Number(r.template_version),format:String(r.render_format),evidenceCount:arr(r.source_evidence_ids).length,createdAt:date(r.created_at)}));
 const gates=(gatesResult.rows??[]).map(g=>({id:String(g.id),level:String(g.level??'Gate'),reason:g.reason?String(g.reason):undefined,decidedAt:g.decided_at?date(g.decided_at):undefined}));
 const evidence=(evidenceResult.rows??[]).map(e=>({id:String(e.id),documentId:String(e.document_id),filename:String(e.filename),quote:e.quote?String(e.quote):undefined,location:e.page_number?`стр. ${e.page_number}`:e.sheet_name?`${e.sheet_name}${e.cell_range?' · '+e.cell_range:''}`:'источник'}));
 return{status:200 as const,body:renderDocumentFactory({projectId,projectName:String(project.name??projectId),templates:listTemplates(),runs,gates,evidence})};
}
