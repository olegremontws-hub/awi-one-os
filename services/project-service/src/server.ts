import http from 'node:http';
import { providerFromEnv } from '../../agent-runtime/src/openai-compatible-provider.js';
import { PostgresVS001Repository } from './postgres-vs001-repository.js';
import { createPostgresPool } from './postgres.js';
import { routeProjectRequest } from './http-routes.js';
import { LocalObjectStorage } from '../../document-service/src/storage.js';

async function readJson(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown>;
}

export function createServer() {
  const db = createPostgresPool();
  const deps = { provider: providerFromEnv(), repository: new PostgresVS001Repository(db), db, storage: new LocalObjectStorage() };
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'ok' }));
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
