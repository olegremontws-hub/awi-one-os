import type { DocumentSqlClient } from './document-repository.js';
import { withTransaction, type TransactionalDb } from '../../project-service/src/postgres.js';

export type DocumentProcessingStatus = 'uploaded'|'processing'|'completed'|'failed';

export async function setDocumentStatus(db: DocumentSqlClient, input: {
  documentId:string; projectId:string; status:DocumentProcessingStatus; error?:string;
}) {
  const work = async (client: DocumentSqlClient) => {
  const updated = await client.query(
    "update project_documents set processing_status=$1,failure_reason=$2 where id=$3 and project_id=$4",
    [input.status,input.error ?? null,input.documentId,input.projectId],
  ) as { rowCount?: number | null };
  if(updated.rowCount === 0) throw new Error('DOCUMENT_NOT_FOUND');
  if(input.error) {
    await client.query(
      "insert into audit_events (id,project_id,event_type,actor_type,actor_id,evidence_refs,payload,occurred_at) values (gen_random_uuid(),$1,'DOCUMENT_PROCESSING_FAILED','system','document-service',$2::jsonb,$3::jsonb,now())",
      [input.projectId,JSON.stringify([`document:${input.documentId}`]),JSON.stringify({documentId:input.documentId,error:input.error})],
    );
  }
  };
  const transactional = db as DocumentSqlClient & Partial<TransactionalDb>;
  if(transactional.connect) return withTransaction(transactional as TransactionalDb, work as any);
  return work(db);
}
