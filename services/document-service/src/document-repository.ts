export interface DocumentSqlClient {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

export async function saveProjectDocument(db: DocumentSqlClient, document: {
  documentId: string; projectId: string; filename: string; storageKey: string; mimeType: string;
}) {
  await db.query(
    'insert into project_documents (id,project_id,filename,storage_key,mime_type,processing_status) values ($1,$2,$3,$4,$5,$6)',
    [document.documentId, document.projectId, document.filename, document.storageKey, document.mimeType, 'uploaded'],
  );
}
