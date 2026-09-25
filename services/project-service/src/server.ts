import http from 'node:http';
import { runtimeProviderFromEnv } from '../../agent-runtime/src/provider-factory.js';
import { PostgresVS001Repository } from './postgres-vs001-repository.js';
import { createPostgresPool } from './postgres.js';
import { routeProjectRequest } from './http-routes.js';
import { LocalObjectStorage } from '../../document-service/src/storage.js';
import { objectStorageFromEnv } from '../../document-service/src/s3-storage.js';
import { readMultipartDocument } from './multipart.js';
import { validateRuntimeEnv } from './env.js';
import { uploadAndRunVS001 } from './upload-handler.js';

async function readJson(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown>;
}

export function createServer() {
  validateRuntimeEnv();
  const db = createPostgresPool();
  const storage = process.env.AWI_S3_BUCKET ? objectStorageFromEnv() : new LocalObjectStorage();
  const deps = { provider: runtimeProviderFromEnv(), repository: new PostgresVS001Repository(db), db, storage };
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'ok' }));
      }
      if (req.method === 'GET' && req.url === '/ready') {
        try {
          await db.query('select 1');
          res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'ready' }));
        } catch {
          res.writeHead(503, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'not_ready' }));
        }
      }
      const upload = (req.url ?? '').match(/^\/v1\/projects\/([^/]+)\/documents$/);
      if (req.method === 'POST' && upload && (req.headers['content-type'] ?? '').startsWith('multipart/form-data')) {
        const file = await readMultipartDocument(req);
        const result = await uploadAndRunVS001({
          projectId: upload[1]!, filename: file.filename, mimeType: file.mimeType,
          bytes: file.bytes,
          correlationId: file.correlationId ?? crypto.randomUUID(),
          provider: deps.provider, repository: deps.repository, db: deps.db, storage: deps.storage,
        });
        res.writeHead(201, { 'content-type': 'application/json' }); return res.end(JSON.stringify(result));
      }
      const result = await routeProjectRequest(req.method ?? 'GET', req.url ?? '/', req.method === 'GET' ? {} : await readJson(req), deps);
      res.writeHead(result.status, { 'content-type': 'application/json' }); res.end(JSON.stringify(result.body));
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'internal_error' }));
    }
  });
}

if (process.env.NODE_ENV !== 'test') createServer().listen(Number(process.env.PORT ?? 3001));
