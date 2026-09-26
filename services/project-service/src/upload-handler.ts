import type { ModelProvider } from '../../agent-runtime/src/providers.js';
import type { VS001Repository } from './vs001-persistence.js';
import type { GateSqlClient } from './human-gate-service.js';
import type { ObjectStorage } from '../../document-service/src/storage.js';
import { PlainTextExtractor, extractDocumentText } from '../../document-service/src/extract-text.js';
import { PdfTextExtractor, XlsxTextExtractor } from '../../document-service/src/rich-extractors.js';
import { randomUUID } from 'node:crypto';
import { saveProjectDocument } from '../../document-service/src/document-repository.js';
import { setDocumentStatus } from '../../document-service/src/document-lifecycle.js';
import { handleRoundTableIntake } from './round-table-handler.js';
import { sha256 } from '../../document-service/src/integrity.js';
import { findDocumentByHash } from './idempotency.js';

export async function uploadAndRunVS001(input: {
  projectId: string; filename: string; mimeType: string; bytes: Uint8Array;
  correlationId: string; provider: ModelProvider; repository: VS001Repository;
  db: GateSqlClient; storage: ObjectStorage;
}) {
  const bytes = input.bytes;
  const contentSha256 = sha256(bytes);
  const duplicate = await findDocumentByHash(input.db, { projectId: input.projectId, contentSha256 });
  if (duplicate) return { document: duplicate, duplicate: true as const };

  const documentId = randomUUID();
  const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = `projects/${input.projectId}/documents/${documentId}/${safeFilename}`;
  await input.storage.put(storageKey, bytes);
  const inserted = await saveProjectDocument(input.db, {
    documentId, projectId: input.projectId, filename: input.filename, mimeType: input.mimeType,
    storageKey, correlationId: input.correlationId, contentSha256,
  });
  if (!inserted) {
    const concurrentDuplicate = await findDocumentByHash(input.db, { projectId: input.projectId, contentSha256 });
    await input.storage.delete(storageKey);
    if (!concurrentDuplicate) throw new Error('DOCUMENT_IDEMPOTENCY_CONFLICT');
    return { document: concurrentDuplicate, duplicate: true as const };
  }
  let text: string;
  try {
    text = await extractDocumentText({
      bytes, filename: input.filename, mimeType: input.mimeType,
      extractors: [new PlainTextExtractor(), new PdfTextExtractor(), new XlsxTextExtractor()],
    });
  } catch (error) {
    await input.storage.delete(storageKey);
    await setDocumentStatus(input.db, {
      documentId, projectId: input.projectId, status: 'failed',
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    throw error;
  }
  const uploaded = { documentId, projectId: input.projectId, filename: input.filename, mimeType: input.mimeType, storageKey, text };
  await setDocumentStatus(input.db, { documentId, projectId: input.projectId, status: 'processing' });
  try {
    const result = await handleRoundTableIntake({
    projectId: input.projectId, documentId: uploaded.documentId, documentText: uploaded.text,
    correlationId: input.correlationId, provider: input.provider, repository: input.repository,
  });
    await setDocumentStatus(input.db, { documentId: uploaded.documentId, projectId: input.projectId, status: 'completed' });
    return { document: { ...uploaded, text: undefined }, ...result };
  } catch (error) {
    await setDocumentStatus(input.db, { documentId: uploaded.documentId, projectId: input.projectId, status: 'failed', error: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
}
