import type { DocumentSqlClient } from './document-repository.js';

export async function recoverStuckProcessing(db:DocumentSqlClient,input:{olderThanMinutes?:number}={}){
  const minutes=Math.max(1,input.olderThanMinutes??15);
  const result=await db.query(
    `update project_documents
       set processing_status='failed',failure_reason='PROCESSING_TIMEOUT'
       where processing_status='processing'
         and created_at < now() - ($1 * interval '1 minute')
       returning id,project_id`,
    [minutes],
  ) as {rows?:Array<Record<string,unknown>>};
  const rows=result.rows??[];
  for(const row of rows){
    await db.query(
      `insert into audit_events
        (id,project_id,event_type,actor_type,actor_id,evidence_refs,payload,occurred_at)
       values (gen_random_uuid(),$1,'DOCUMENT_PROCESSING_RECOVERED','system','document-service',$2::jsonb,$3::jsonb,now())`,
      [row.project_id,JSON.stringify([`document:${row.id}`]),JSON.stringify({documentId:row.id,reason:'PROCESSING_TIMEOUT'})],
    );
  }
  return rows.length;
}
