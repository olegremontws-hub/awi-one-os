import type { GateSqlClient } from './human-gate-service.js';

export async function findDocumentByHash(db: GateSqlClient, input: {
  projectId: string; contentSha256: string;
}) {
  const result = await db.query(
    'select id,filename,storage_key,mime_type,processing_status from project_documents where project_id=$1 and content_sha256=$2 limit 1',
    [input.projectId, input.contentSha256],
  );
  return result.rows?.[0] ?? null;
}
