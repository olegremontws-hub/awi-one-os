export interface DocumentSqlClient {
  query(sql:string,params?:unknown[]):Promise<{rows?:Array<Record<string,unknown>>;rowCount?:number|null}|unknown>;
}

export async function saveProjectDocument(db:DocumentSqlClient,document:{
  documentId:string;projectId:string;filename:string;storageKey:string;mimeType:string;
  correlationId?:string;contentSha256?:string;
}) {
  const result=await db.query(
    `insert into project_documents
      (id,project_id,filename,storage_key,mime_type,processing_status,correlation_id,content_sha256)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (project_id,content_sha256) where content_sha256 is not null do nothing
     returning id,filename,storage_key,mime_type,processing_status`,
    [document.documentId,document.projectId,document.filename,document.storageKey,document.mimeType,'uploaded',document.correlationId??null,document.contentSha256??null],
  ) as {rows?:Array<Record<string,unknown>>;rowCount?:number|null};
  return result.rows?.[0] ?? null;
}
