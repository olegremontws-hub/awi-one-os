import test from 'node:test';
import assert from 'node:assert/strict';
import type { ObjectStorage } from '../services/document-service/src/storage.js';
import { PlainTextExtractor } from '../services/document-service/src/extract-text.js';
import { uploadProjectDocument } from '../services/document-service/src/upload.js';

class MemoryStorage implements ObjectStorage {
  objects = new Map<string, Uint8Array>();
  async put(key:string, bytes:Uint8Array){ this.objects.set(key, bytes); }
  async get(key:string){ const value=this.objects.get(key); if(!value) throw new Error('missing'); return value; }
}

test('uploaded text document is stored and extracted without documentText input', async () => {
  const storage = new MemoryStorage();
  const result = await uploadProjectDocument({
    projectId:'p1', filename:'brief.txt', mimeType:'text/plain',
    bytes:new TextEncoder().encode('Project brief'), storage, extractors:[new PlainTextExtractor()],
  });
  assert.equal(result.text, 'Project brief');
  assert.equal(storage.objects.has(result.storageKey), true);
});
