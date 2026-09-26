import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readMultipartDocument } from '../services/project-service/src/multipart.js';

function requestWithMultipart(payload:string,boundary:string){
  const req=new PassThrough() as PassThrough & {headers:Record<string,string>};
  req.headers={'content-type':`multipart/form-data; boundary=${boundary}`};
  process.nextTick(()=>req.end(Buffer.from(payload)));
  return req as any;
}

test('multipart upload enforces configured file-size limit',async()=>{
  const boundary='awi-test-boundary';
  const payload=`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="brief.txt"\r\nContent-Type: text/plain\r\n\r\n123456789\r\n--${boundary}--\r\n`;
  await assert.rejects(()=>readMultipartDocument(requestWithMultipart(payload,boundary),4),/UPLOAD_TOO_LARGE/);
});

test('multipart upload requires a document file',async()=>{
  const boundary='awi-test-boundary-empty';
  const payload=`--${boundary}\r\nContent-Disposition: form-data; name="correlationId"\r\n\r\nabc\r\n--${boundary}--\r\n`;
  await assert.rejects(()=>readMultipartDocument(requestWithMultipart(payload,boundary),64),/DOCUMENT_FILE_REQUIRED/);
});
