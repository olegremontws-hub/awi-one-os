import type {GateSqlClient} from './human-gate-service.js';
import {getProject} from './project-lifecycle.js';
import {renderProjectEstimate} from '../../../apps/round-table/src/estimate-screen.js';

const arr=(v:unknown)=>Array.isArray(v)?v:[];

export async function getProjectEstimatePage(db:GateSqlClient,projectId:string){
  const project=await getProject(db,projectId);
  if(!project)return{status:404 as const,body:'<!doctype html><html lang="ru"><meta charset="utf-8"><title>AWI ONE — проект не найден</title><body>PROJECT_NOT_FOUND</body></html>'};
  const estimateResult=await db.query(
    'select id,name,estimate_type,currency,version,status,created_at from estimates where project_id=$1 order by version desc,created_at desc limit 1',
    [projectId],
  );
  const e=estimateResult.rows?.[0];
  if(!e)return{status:200 as const,body:renderProjectEstimate({projectId,projectName:String(project.name??projectId),rows:[]})};
  const [items,evidenceResult,priceEvidenceResult]=await Promise.all([db.query(
    `select ei.id,ei.work_item_id,wi.code,wi.name,ei.quantity,ei.unit,
      ei.labor_amount,ei.material_amount,ei.equipment_amount,ei.logistics_amount,ei.subcontract_amount,
      ei.overhead_amount,ei.risk_amount,ei.vat_amount,ei.total_amount,ei.price_evidence_ids,ei.evidence_ids
     from estimate_items ei
     join work_items wi on wi.id=ei.work_item_id
     where ei.estimate_id=$1
     order by coalesce(wi.code,''),wi.name,ei.id`,
    [String(e.id)],
  ),db.query('select id,document_id from evidence where project_id=$1',[projectId]),db.query('select id,source_document_id,evidence_ids from price_evidence where project_id=$1',[projectId])]);
  const evidenceDocument=new Map((evidenceResult.rows??[]).map(row=>[String(row.id),String(row.document_id)]));
  const priceEvidence=new Map((priceEvidenceResult.rows??[]).map(row=>[String(row.id),{sourceDocumentId:row.source_document_id?String(row.source_document_id):undefined,evidenceIds:arr(row.evidence_ids).map(String)}]));
  const rows=(items.rows??[]).map(row=>({
    id:String(row.id),workItemId:String(row.work_item_id),code:row.code?String(row.code):undefined,name:String(row.name??''),
    quantity:Number(row.quantity??0),unit:String(row.unit??''),
    labor:row.labor_amount===null||row.labor_amount===undefined?undefined:Number(row.labor_amount),
    material:row.material_amount===null||row.material_amount===undefined?undefined:Number(row.material_amount),
    equipment:row.equipment_amount===null||row.equipment_amount===undefined?undefined:Number(row.equipment_amount),
    logistics:row.logistics_amount===null||row.logistics_amount===undefined?undefined:Number(row.logistics_amount),
    subcontract:row.subcontract_amount===null||row.subcontract_amount===undefined?undefined:Number(row.subcontract_amount),
    overhead:row.overhead_amount===null||row.overhead_amount===undefined?undefined:Number(row.overhead_amount),
    risk:row.risk_amount===null||row.risk_amount===undefined?undefined:Number(row.risk_amount),
    vat:row.vat_amount===null||row.vat_amount===undefined?undefined:Number(row.vat_amount),
    total:Number(row.total_amount??0),evidenceCount:arr(row.evidence_ids).length,priceEvidenceCount:arr(row.price_evidence_ids).length,
    evidenceSources:arr(row.evidence_ids).map(String).flatMap(id=>evidenceDocument.has(id)?[{id,documentId:evidenceDocument.get(id)!}]:[]),
    priceSources:arr(row.price_evidence_ids).map(String).flatMap(id=>{const price=priceEvidence.get(id);if(!price)return[];const documentId=price.sourceDocumentId??price.evidenceIds.map(evidenceId=>evidenceDocument.get(evidenceId)).find(Boolean);return documentId?[{id,documentId}]:[];}),
  }));
  return{status:200 as const,body:renderProjectEstimate({
    projectId,projectName:String(project.name??projectId),
    estimate:{id:String(e.id),name:String(e.name??''),estimateType:String(e.estimate_type??''),currency:String(e.currency??'RUB'),version:Number(e.version??1),status:String(e.status??'draft'),createdAt:e.created_at instanceof Date?e.created_at.toISOString():String(e.created_at??'')},
    rows,
  })};
}
