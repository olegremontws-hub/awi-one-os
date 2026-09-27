import type {GateSqlClient} from './human-gate-service.js';
import {getProject} from './project-lifecycle.js';
import {renderProjectDocuments} from '../../../apps/round-table/src/documents-screen.js';
import {renderDocumentAnalysis} from '../../../apps/round-table/src/document-analysis-screen.js';

const notFound=(code:string)=>({status:404 as const,body:'<!doctype html><html lang="ru"><meta charset="utf-8"><title>AWI ONE — не найдено</title><body>'+code+'</body></html>'});
const ids=(value:unknown)=>Array.isArray(value)?value.map(String):[];

export async function getProjectDocumentsPage(db:GateSqlClient,projectId:string){
 const project=await getProject(db,projectId);if(!project)return notFound('PROJECT_NOT_FOUND');
 const [docsResult,evidenceResult,factsResult]=await Promise.all([
  db.query('select id,filename,document_kind,processing_status,mime_type,current_version,created_at from project_documents where project_id=$1 order by created_at desc',[projectId]),
  db.query('select id,document_id from evidence where project_id=$1',[projectId]),
  db.query('select id,evidence_ids from extracted_facts where project_id=$1',[projectId]),
 ]);
 const evidenceByDoc=new Map<string,Set<string>>();
 for(const row of evidenceResult.rows??[]){const doc=String(row.document_id),id=String(row.id);const set=evidenceByDoc.get(doc)??new Set<string>();set.add(id);evidenceByDoc.set(doc,set);}
 const factCount=new Map<string,number>();
 for(const fact of factsResult.rows??[]){const factEvidence=ids(fact.evidence_ids);for(const [doc,set] of evidenceByDoc){if(factEvidence.some(id=>set.has(id)))factCount.set(doc,(factCount.get(doc)??0)+1);}}
 const documents=(docsResult.rows??[]).map(row=>({id:String(row.id),filename:String(row.filename??''),kind:String(row.document_kind??'other'),status:String(row.processing_status??'unknown'),mimeType:String(row.mime_type??''),currentVersion:Number(row.current_version??1),evidenceCount:evidenceByDoc.get(String(row.id))?.size??0,factCount:factCount.get(String(row.id))??0,createdAt:row.created_at instanceof Date?row.created_at.toISOString():String(row.created_at??'')}));
 return{status:200 as const,body:renderProjectDocuments({projectId,projectName:String(project.name??projectId),documents})};
}

export async function getProjectDocumentAnalysisPage(db:GateSqlClient,projectId:string,documentId:string){
 const project=await getProject(db,projectId);if(!project)return notFound('PROJECT_NOT_FOUND');
 const documentResult=await db.query('select id,filename,document_kind,processing_status,mime_type,current_version,storage_key from project_documents where project_id=$1 and id=$2 limit 1',[projectId,documentId]);
 const row=documentResult.rows?.[0];if(!row)return notFound('DOCUMENT_NOT_FOUND');
 const [evidenceResult,factsResult,relationsResult,reviewResult]=await Promise.all([
  db.query('select id,page_number,sheet_name,cell_range,quote from evidence where project_id=$1 and document_id=$2 order by page_number nulls last,sheet_name nulls last,cell_range nulls last,created_at',[projectId,documentId]),
  db.query('select id,fact_type,value,unit,confidence,status,evidence_ids from extracted_facts where project_id=$1 order by fact_type,id',[projectId]),
  db.query("select id,relation_type,case when from_document_id=$2 then to_document_id else from_document_id end other_document_id,case when from_document_id=$2 then 'from' else 'to' end direction from document_relations where project_id=$1 and (from_document_id=$2 or to_document_id=$2) order by created_at",[projectId,documentId]),
  db.query("select id,decision_id,status from human_gates where project_id=$1 and payload->>'documentId'=$2 order by id desc limit 1",[projectId,documentId]),
 ]);
 const evidence=(evidenceResult.rows??[]).map(e=>({id:String(e.id),pageNumber:e.page_number===null||e.page_number===undefined?undefined:Number(e.page_number),sheetName:e.sheet_name?String(e.sheet_name):undefined,cellRange:e.cell_range?String(e.cell_range):undefined,quote:String(e.quote??'')}));
 const evidenceSet=new Set(evidence.map(e=>e.id));
 const facts=(factsResult.rows??[]).filter(f=>ids(f.evidence_ids).some(id=>evidenceSet.has(id))).map(f=>({id:String(f.id),type:String(f.fact_type),value:f.value,unit:f.unit?String(f.unit):undefined,confidence:f.confidence===null||f.confidence===undefined?undefined:Number(f.confidence),status:String(f.status),evidenceIds:ids(f.evidence_ids).filter(id=>evidenceSet.has(id))}));
 const relations=(relationsResult.rows??[]).map(r=>({id:String(r.id),type:String(r.relation_type),otherDocumentId:String(r.other_document_id),direction:String(r.direction)==='to'?'to' as const:'from' as const}));
 const reviewRow=reviewResult.rows?.[0];
 const reviewGate=reviewRow?{id:String(reviewRow.id),decisionId:String(reviewRow.decision_id),status:String(reviewRow.status)}:undefined;
 return{status:200 as const,body:renderDocumentAnalysis({projectId,projectName:String(project.name??projectId),document:{id:String(row.id),filename:String(row.filename??''),kind:String(row.document_kind??'other'),status:String(row.processing_status??'unknown'),mimeType:String(row.mime_type??''),currentVersion:Number(row.current_version??1),storageKey:String(row.storage_key??'')},evidence,facts,relations,reviewGate})};
}
