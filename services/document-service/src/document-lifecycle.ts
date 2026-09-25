import type { DocumentSqlClient } from './document-repository.js';

export type DocumentProcessingStatus = 'uploaded'|'processing'|'completed'|'failed';

export async function setDocumentStatus(db: DocumentSqlClient, input: {
  documentId:string; projectId:string; status:DocumentProcessingStatus; error?:string;
}) {
  await db.query(
    "update project_documents set processing_status=$1,failure_reason=$2 where id=$3 and project_id=$4",
    [input.status,input.error ?? null,input.documentId,input.projectId],
  );
  if(input.error) {
    await db.query(
      "insert into audit_events (id,project_id,event_type,actor_type,actor_id,evidence_refs,payload,occurred_at) values (gen_random_uuid(),$1,'DOCUMENT_PROCESSING_FAILED','system','document-service',$2::jsonb,$3::jsonb,now())",
      [input.projectId,JSON.stringify([`document:${input.documentId}`]),JSON.stringify({documentId:input.documentId,error:input.error})],
    );
  }
}
