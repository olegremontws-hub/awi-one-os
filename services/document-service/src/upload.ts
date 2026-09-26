import { randomUUID } from 'node:crypto';
import type { ObjectStorage } from './storage.js';
import { extractDocumentText, type TextExtractor } from './extract-text.js';

export async function uploadProjectDocument(input: {
  projectId: string; filename: string; mimeType: string; bytes: Uint8Array;
  storage: ObjectStorage; extractors: TextExtractor[];
}) {
  const documentId = randomUUID();
  const storageKey = `projects/${input.projectId}/documents/${documentId}/${input.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await input.storage.put(storageKey, input.bytes);
  let text: string;
  try {
    text = await extractDocumentText({ bytes: input.bytes, filename: input.filename, mimeType: input.mimeType, extractors: input.extractors });
  } catch (error) {
    await input.storage.delete(storageKey);
    throw error;
  }
  return { documentId, projectId: input.projectId, filename: input.filename, mimeType: input.mimeType, storageKey, text };
}
