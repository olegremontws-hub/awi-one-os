import type { GateSqlClient } from './human-gate-service.js';
import type { ObjectStorage } from '../../document-service/src/storage.js';

const asciiFilename = (value: string) => value.replace(/[^\x20-\x7e]/g, '_').replace(/["\\\r\n]/g, '_') || 'document';

export async function getProjectDocumentDownload(
  db: GateSqlClient,
  storage: ObjectStorage,
  projectId: string,
  documentId: string,
) {
  const result = await db.query(
    'select filename,storage_key,mime_type from project_documents where project_id=$1 and id=$2 limit 1',
    [projectId, documentId],
  );
  const row = result.rows?.[0];
  if (!row) return { status: 404 as const, body: Buffer.from('DOCUMENT_NOT_FOUND'), headers: { 'content-type': 'text/plain; charset=utf-8' } };
  const filename = String(row.filename ?? 'document');
  const bytes = Buffer.from(await storage.get(String(row.storage_key)));
  return {
    status: 200 as const,
    body: bytes,
    headers: {
      'content-type': String(row.mime_type ?? 'application/octet-stream'),
      'content-length': String(bytes.byteLength),
      'content-disposition': `attachment; filename="${asciiFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  };
}
