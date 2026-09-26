import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readJsonBody } from '../services/project-service/src/json-body.js';

function requestWithBody(body: string, contentLength?: string) {
  const req = new PassThrough() as PassThrough & { headers: Record<string, string> };
  req.headers = contentLength === undefined ? {} : { 'content-length': contentLength };
  process.nextTick(() => req.end(Buffer.from(body)));
  return req as any;
}

test('JSON body reader accepts an object at the configured byte limit', async () => {
  const body = '{"ok":true}';
  const result = await readJsonBody(requestWithBody(body), Buffer.byteLength(body));
  assert.deepEqual(result, { ok: true });
});

test('JSON body reader rejects a declared oversized request before buffering it', async () => {
  await assert.rejects(
    () => readJsonBody(requestWithBody('{"ok":true}', '1024'), 32),
    /REQUEST_BODY_TOO_LARGE/,
  );
});

test('JSON body reader rejects a chunked request that crosses the byte limit', async () => {
  await assert.rejects(
    () => readJsonBody(requestWithBody('{"payload":"too large"}'), 12),
    /REQUEST_BODY_TOO_LARGE/,
  );
});

test('JSON body reader rejects malformed and non-object JSON payloads', async () => {
  await assert.rejects(() => readJsonBody(requestWithBody('{')), /INVALID_JSON_BODY/);
  await assert.rejects(() => readJsonBody(requestWithBody('[1,2,3]')), /INVALID_JSON_BODY/);
});
