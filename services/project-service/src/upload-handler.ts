import type { ModelProvider } from '../../agent-runtime/src/providers.js';
import type { VS001Repository } from './vs001-persistence.js';
import type { GateSqlClient } from './human-gate-service.js';
import type { ObjectStorage } from '../../document-service/src/storage.js';
import { PlainTextExtractor } from '../../document-service/src/extract-text.js';
import { PdfTextExtractor, XlsxTextExtractor } from '../../document-service/src/rich-extractors.js';
import { uploadProjectDocument } from '../../document-service/src/upload.js';
import { saveProjectDocument } from '../../document-service/src/document-repository.js';
import { setDocumentStatus } from '../../document-service/src/document-lifecycle.js';
import { createHumanGateIfRequired } from './human-gate-create.js';
import { handleRoundTableIntake } from './round-table-handler.js';

export async function uploadAndRunVS001(input: {
  projectId: string; filename: string; mimeType: string; base64: string;
  correlationId: string; provider: ModelProvider; repository: VS001Repository;
  db: GateSqlClient; storage: ObjectStorage;
}) {
  const uploaded = await uploadProjectDocument({
    projectId: input.projectId, filename: input.filename, mimeType: input.mimeType,
    bytes: Buffer.from(input.base64, 'base64'), storage: input.storage,
    extractors: [new PlainTextExtractor(), new PdfTextExtractor(), new XlsxTextExtractor()],
  });
  await saveProjectDocument(input.db, uploaded);
  await setDocumentStatus(input.db, { documentId: uploaded.documentId, projectId: input.projectId, status: 'processing' });
  try {
    const result = await handleRoundTableIntake({
    projectId: input.projectId, documentId: uploaded.documentId, documentText: uploaded.text,
    correlationId: input.correlationId, provider: input.provider, repository: input.repository,
  });
    await createHumanGateIfRequired(input.db, result.decision);
    await setDocumentStatus(input.db, { documentId: uploaded.documentId, projectId: input.projectId, status: 'completed' });
    return { document: { ...uploaded, text: undefined }, ...result };
  } catch (error) {
    await setDocumentStatus(input.db, { documentId: uploaded.documentId, projectId: input.projectId, status: 'failed', error: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
}
