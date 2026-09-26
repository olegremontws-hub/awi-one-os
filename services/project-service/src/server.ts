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
import { authContextFromRequest, authorize, authorizeProjectScope, scopedProjectIdFromPath } from './auth.js';
import { jwtVerifierFromEnv } from './jwt-auth.js';
import { ocrProviderFromEnv } from '../../document-service/src/http-ocr-provider.js';
import { getProjectRoundTablePage } from './round-table-page.js';
import { getProjectDocumentsPage, getProjectDocumentAnalysisPage } from './project-document-pages.js';
import { getProjectEstimatePage } from './project-estimate-page.js';
import { getProjectContractsPage, getProjectContractPage } from './project-contract-pages.js';
import { getProjectHistoryPage } from './project-history-page.js';

async function readJson(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown>;
}

export function createServer() {
  validateRuntimeEnv();
  const db = createPostgresPool();
  const storage = process.env.AWI_S3_BUCKET ? objectStorageFromEnv() : new LocalObjectStorage();
  const jwtVerifier = jwtVerifierFromEnv();
  const deps = { provider: runtimeProviderFromEnv(), repository: new PostgresVS001Repository(db), db, storage, ocrProvider: ocrProviderFromEnv() };
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'ok' }));
      }
      if (req.method === 'GET' && req.url === '/ready') {
        try {
          await db.query('select 1');
          const probeKey = `.readiness/${crypto.randomUUID()}`;
          const probeBytes = Buffer.from('awi-ready');
          let probeWritten = false;
          try {
            await storage.put(probeKey, probeBytes);
            probeWritten = true;
            const stored = await storage.get(probeKey);
            if (!Buffer.from(stored).equals(probeBytes)) throw new Error('STORAGE_READINESS_FAILED');
          } finally {
            if (probeWritten) await storage.delete(probeKey);
          }
          if (!(await deps.provider.ready())) throw new Error('MODEL_PROVIDER_NOT_READY');
          const ocr = deps.ocrProvider ? (await deps.ocrProvider.ready() ? 'ok' : 'not_ready') : 'disabled';
          if (ocr === 'not_ready') throw new Error('OCR_PROVIDER_NOT_READY');
          res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'ready', checks: { database: 'ok', storage: 'ok', modelProvider: 'ok', ocr } }));
        } catch {
          res.writeHead(503, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ status: 'not_ready' }));
        }
      }
      const auth = await authContextFromRequest(req.headers, process.env, jwtVerifier);
      const path = req.url ?? '/';
      const isRead = req.method === 'GET';
      const isDecision = /\/decisions\/[^/]+\/(approve|reject)$/.test(path);
      authorize(auth, isDecision ? 'decision:decide' : isRead ? 'project:read' : 'project:write');
      const scopedProjectId = scopedProjectIdFromPath(path);
      if (scopedProjectId) await authorizeProjectScope(db, auth, scopedProjectId);
      const appHistory = path.match(/^\/app\/projects\/([^/?#]+)\/history\/?$/);
      if (req.method === 'GET' && appHistory) {
        const page = await getProjectHistoryPage(db, appHistory[1]!);
        res.writeHead(page.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(page.body);
      }
      const appContract = path.match(/^\/app\/projects\/([^/?#]+)\/contracts\/([^/?#]+)\/?$/);
      if (req.method === 'GET' && appContract) {
        const page = await getProjectContractPage(db, appContract[1]!, appContract[2]!);
        res.writeHead(page.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(page.body);
      }
      const appContracts = path.match(/^\/app\/projects\/([^/?#]+)\/contracts\/?$/);
      if (req.method === 'GET' && appContracts) {
        const page = await getProjectContractsPage(db, appContracts[1]!);
        res.writeHead(page.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(page.body);
      }
      const appEstimate = path.match(/^\/app\/projects\/([^/?#]+)\/estimate\/?$/);
      if (req.method === 'GET' && appEstimate) {
        const page = await getProjectEstimatePage(db, appEstimate[1]!);
        res.writeHead(page.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(page.body);
      }
      const appDocument = path.match(/^\/app\/projects\/([^/?#]+)\/documents\/([^/?#]+)\/?$/);
      if (req.method === 'GET' && appDocument) {
        const page = await getProjectDocumentAnalysisPage(db, appDocument[1]!, appDocument[2]!);
        res.writeHead(page.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(page.body);
      }
      const appDocuments = path.match(/^\/app\/projects\/([^/?#]+)\/documents\/?$/);
      if (req.method === 'GET' && appDocuments) {
        const page = await getProjectDocumentsPage(db, appDocuments[1]!);
        res.writeHead(page.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(page.body);
      }
      const appProject = path.match(/^\/app\/projects\/([^/?#]+)\/?$/);
      if (req.method === 'GET' && appProject) {
        const page = await getProjectRoundTablePage(db, appProject[1]!);
        res.writeHead(page.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(page.body);
      }
      const upload = path.match(/^\/v1\/projects\/([^/]+)\/documents$/);
      if (req.method === 'POST' && upload && (req.headers['content-type'] ?? '').startsWith('multipart/form-data')) {
        const file = await readMultipartDocument(req);
        const result = await uploadAndRunVS001({
          projectId: upload[1]!, filename: file.filename, mimeType: file.mimeType,
          bytes: file.bytes,
          correlationId: file.correlationId ?? crypto.randomUUID(),
          provider: deps.provider, repository: deps.repository, db: deps.db, storage: deps.storage, ocrProvider: deps.ocrProvider,
        });
        res.writeHead(201, { 'content-type': 'application/json' }); return res.end(JSON.stringify(result));
      }
      const body = req.method === 'GET' ? {} : await readJson(req);
      const result = await routeProjectRequest(req.method ?? 'GET', req.url ?? '/', { ...body, actorId: auth.actorId }, deps);
      res.writeHead(result.status, { 'content-type': 'application/json' }); res.end(JSON.stringify(result.body));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'internal_error';
      const status = message === 'UPLOAD_TOO_LARGE' ? 413
        : message === 'DOCUMENT_FILE_REQUIRED' ? 400
        : /^(PDF|XLSX)_EXTRACTION_FAILED(?::|$)/.test(message) || message === 'PDF_OCR_REQUIRED' || message === 'OCR_PROVIDER_UNAVAILABLE' || message === 'OCR_PROVIDER_NOT_READY' || message === 'OCR_RESULT_INVALID' || message === 'OCR_RESULT_TOO_LARGE' || message === 'OCR_NO_TEXT' || message === 'XLSX_EXTRACTION_UNAVAILABLE' || message.startsWith('UNSUPPORTED_DOCUMENT_TYPE:') ? 422
        : message === 'AUTHENTICATION_REQUIRED' || message.startsWith('JWT_') || message.startsWith('JWKS_') ? 401
        : message === 'ACTOR_ID_MISMATCH' || message === 'AUTHORIZATION_REQUIRED' || message === 'PROJECT_ACCESS_DENIED' ? 403
        : 500;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: message }));
    }
  });
}

if (process.env.NODE_ENV !== 'test') createServer().listen(Number(process.env.PORT ?? 3001));
