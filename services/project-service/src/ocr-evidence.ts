import type {OcrResult} from '../../document-service/src/ingestion-gateway.js';
import {withTransaction,type TransactionalDb} from './postgres.js';
import type {GateSqlClient} from './human-gate-service.js';

export async function persistOcrEvidence(db:GateSqlClient,input:{
 projectId:string;documentId:string;storageKey:string;contentSha256:string;correlationId:string;ocr:OcrResult;
}){
 const work=async(client:GateSqlClient)=>{
  const version=await client.query(
   `insert into document_versions(document_id,version,storage_key,sha256,extraction_method)
    values($1,1,$2,$3,$4)
    on conflict(document_id,version) do update set extraction_method=excluded.extraction_method
    returning id`,
   [input.documentId,input.storageKey,input.contentSha256,`ocr:${input.ocr.provider}:${input.ocr.pipelineVersion}`],
  );
  const versionId=String(version.rows?.[0]?.id??'');if(!versionId)throw new Error('OCR_VERSION_PERSIST_FAILED');
  const evidenceIds:string[]=[];
  for(const page of input.ocr.pages){
   const e=await client.query(
    `insert into evidence(project_id,document_id,document_version_id,page_number,quote)
     values($1,$2,$3,$4,$5) returning id`,
    [input.projectId,input.documentId,versionId,page.pageNumber,page.text.slice(0,4000)],
   );
   const id=String(e.rows?.[0]?.id??'');if(!id)throw new Error('OCR_EVIDENCE_PERSIST_FAILED');evidenceIds.push(id);
  }
  const confidence=input.ocr.pages.length?input.ocr.pages.reduce((s,p)=>s+p.confidence,0)/input.ocr.pages.length:0;
  await client.query(
   `insert into audit_events(id,project_id,event_type,actor_type,actor_id,correlation_id,evidence_refs,payload,occurred_at)
    values(gen_random_uuid(),$1,'DOCUMENT_OCR_EXTRACTED','system','document-service',$2,$3::jsonb,$4::jsonb,now())`,
   [input.projectId,input.correlationId,JSON.stringify(evidenceIds),JSON.stringify({documentId:input.documentId,provider:input.ocr.provider,pipelineVersion:input.ocr.pipelineVersion,pageCount:input.ocr.pages.length,meanConfidence:confidence})],
  );
  return{versionId,evidenceIds};
 };
 const transactional=db as GateSqlClient&Partial<TransactionalDb>;
 return transactional.connect?withTransaction(transactional as TransactionalDb,work as any):work(db);
}
