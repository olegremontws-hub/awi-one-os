import type { DocumentSqlClient } from './document-repository.js';

export type DocumentProcessingStatus = 'uploaded'|'processing'|'completed'|'failed';

export async function setDocumentStatus(db: DocumentSqlClient, input: {
  documentId: string; projectId: string; status: DocumentProcessingStatus; error?: string;
}) {
  await db.query(
    "update project_documents set processing_status=$1 where id=$2 and project_id=$3",
    [input.status, input.documentId, input.projectId],
  );
  if (input.error) {
    await db.query(
      "insert into audit_events (id,project_id,event_type,actor_type,actor_id,payload,occurred_at) values (gen_random_uuid(),$1,'DOCUMENT_PROCESSING_FAILED','system','document-service',$2::jsonb,now())",
      [input.projectId, JSON.stringify({ documentId: input.documentId, error: input.error })],
    );
  }
}
