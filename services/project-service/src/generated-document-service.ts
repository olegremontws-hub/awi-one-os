import {randomUUID} from 'node:crypto';
import type {GateSqlClient} from './human-gate-service.js';
import {withTransaction,type TransactionalDb} from './postgres.js';
import type {ObjectStorage} from '../../document-service/src/storage.js';
import {createDocumentDraft,approveDocumentDraft,type DraftField,type GeneratedDocumentKind} from '../../document-service/src/document-factory.js';
import {getTemplate} from '../../document-service/src/document-templates.js';
import {validateRenderRequest} from '../../document-service/src/render-boundary.js';
import {builtInDocumentRenderer} from '../../document-service/src/builtin-document-renderers.js';
import {renderApprovedDocument,type RenderFormat} from '../../document-service/src/document-renderer.js';

export type GeneratedDocumentFieldInput={key:string;value:string|number;evidenceIds:string[]};
export type GeneratedProjectDocumentResult={documentId:string;filename:string;storageKey:string;mimeType:string;sha256?:string;version:number;duplicate:boolean};
export type GenerateProjectDocumentInput={
 projectId:string;kind:GeneratedDocumentKind;format:RenderFormat;fields:GeneratedDocumentFieldInput[];
 humanGateId:string;actorId:string;correlationId:string;
};

export async function generateProjectDocument(db:GateSqlClient,storage:ObjectStorage,input:GenerateProjectDocumentInput):Promise<GeneratedProjectDocumentResult>{
 if(!db.connect)throw new Error('TRANSACTIONAL_DB_REQUIRED');
 if(!input.actorId.trim())throw new Error('ACTOR_ID_REQUIRED');
 if(!input.correlationId.trim())throw new Error('CORRELATION_ID_REQUIRED');
 const template=getTemplate(input.kind);if(!template)throw new Error('DOCUMENT_TEMPLATE_NOT_FOUND');
 if(!template.outputFormats.includes(input.format))throw new Error('OUTPUT_FORMAT_NOT_ALLOWED');

 const prior=await db.query(
  `select r.document_id,p.filename,p.storage_key,p.mime_type,v.sha256,v.version
   from generated_document_runs r
   join project_documents p on p.id=r.document_id
   join document_versions v on v.document_id=p.id and v.version=p.current_version
   where r.project_id=$1 and r.correlation_id=$2 limit 1`,
  [input.projectId,input.correlationId],
 );
 if((prior.rows??[]).length){
  const row=prior.rows![0]!;
  return{documentId:String(row.document_id),filename:String(row.filename),storageKey:String(row.storage_key),mimeType:String(row.mime_type),sha256:row.sha256?String(row.sha256):undefined,version:Number(row.version),duplicate:true};
 }

 const gate=await db.query(
  "select id from human_gates where id=$1 and project_id=$2 and status='approved' limit 1",
  [input.humanGateId,input.projectId],
 );
 if(!(gate.rows??[]).length)throw new Error('HUMAN_GATE_APPROVAL_REQUIRED');

 const uniqueEvidence=[...new Set(input.fields.flatMap(f=>f.evidenceIds))];
 if(!uniqueEvidence.length)throw new Error('DOCUMENT_EVIDENCE_REQUIRED');
 const evidence=await db.query(
  'select id from evidence where project_id=$1 and id = any($2::uuid[])',
  [input.projectId,uniqueEvidence],
 );
 if((evidence.rows??[]).length!==uniqueEvidence.length)throw new Error('DOCUMENT_EVIDENCE_NOT_FOUND');

 const fieldMap=new Map(input.fields.map(f=>[f.key,f]));
 const fields:DraftField[]=[];
 for(const key of template.requiredFields){
  const f=fieldMap.get(key);if(!f)throw new Error('MISSING_REQUIRED_FIELD:'+key);
  fields.push({key,value:f.value,sourceEvidenceIds:[...new Set(f.evidenceIds)],required:true});
 }
 for(const f of input.fields)if(!template.requiredFields.includes(f.key))fields.push({key:f.key,value:f.value,sourceEvidenceIds:[...new Set(f.evidenceIds)]});

 const documentId=randomUUID();
 const draft=createDocumentDraft({id:documentId,projectId:input.projectId,kind:input.kind,templateId:template.id,templateVersion:template.version,fields});
 const approved=approveDocumentDraft(draft,{humanGateId:input.humanGateId});
 const issues=validateRenderRequest(approved,template,input.format);if(issues.length)throw new Error(issues[0]!);
 const artifact=await renderApprovedDocument({draft:approved,version:1,format:input.format,renderer:builtInDocumentRenderer(input.format),storage});
 const filename=`${input.kind}-v1.${input.format}`;

 try{
  await withTransaction(db as TransactionalDb,async client=>{
   await client.query(
    `insert into project_documents
      (id,project_id,filename,storage_key,mime_type,processing_status,document_kind,current_version,correlation_id)
     values($1,$2,$3,$4,$5,'completed',$6,1,$7)`,
    [documentId,input.projectId,filename,artifact.storageKey,artifact.contentType,input.kind,input.correlationId],
   );
   await client.query(
    `insert into document_versions(document_id,version,storage_key,sha256,extraction_method)
     values($1,1,$2,$3,'generated')`,
    [documentId,artifact.storageKey,artifact.sha256??null],
   );
   await client.query(
    `insert into generated_document_runs
      (project_id,document_id,template_id,template_version,render_format,human_gate_id,source_evidence_ids,correlation_id,actor_id)
     values($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
    [input.projectId,documentId,template.id,template.version,input.format,input.humanGateId,JSON.stringify(uniqueEvidence),input.correlationId,input.actorId],
   );
   await client.query(
    `insert into audit_events
      (id,project_id,event_type,actor_type,actor_id,correlation_id,evidence_refs,payload,occurred_at)
     values(gen_random_uuid(),$1,'GENERATED_DOCUMENT_RENDERED','human',$2,$3,$4::jsonb,$5::jsonb,now())`,
    [input.projectId,input.actorId,input.correlationId,JSON.stringify(uniqueEvidence),JSON.stringify({documentId,kind:input.kind,format:input.format,templateId:template.id,templateVersion:template.version,sha256:artifact.sha256})],
   );
  });
 }catch(error){
  await storage.delete(artifact.storageKey);
  const duplicate=await db.query(
   `select r.document_id,p.filename,p.storage_key,p.mime_type,v.sha256,v.version
    from generated_document_runs r
    join project_documents p on p.id=r.document_id
    join document_versions v on v.document_id=p.id and v.version=p.current_version
    where r.project_id=$1 and r.correlation_id=$2 limit 1`,
   [input.projectId,input.correlationId],
  );
  if((duplicate.rows??[]).length){
   const row=duplicate.rows![0]!;
   return{documentId:String(row.document_id),filename:String(row.filename),storageKey:String(row.storage_key),mimeType:String(row.mime_type),sha256:row.sha256?String(row.sha256):undefined,version:Number(row.version),duplicate:true};
  }
  throw error;
 }
 return{documentId,filename,storageKey:artifact.storageKey,mimeType:artifact.contentType,sha256:artifact.sha256,version:1,duplicate:false};
}
