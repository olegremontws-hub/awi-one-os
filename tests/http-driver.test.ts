import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { HttpClientTestDriver } from '../services/client-tester/src/http-driver.js';

test('black-box driver calls public health endpoint', async()=>{
  const server=http.createServer((_req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end('{}')});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address(); assert.ok(address && typeof address==='object');
  try { assert.equal(await new HttpClientTestDriver(`http://127.0.0.1:${address.port}`).health(),true); }
  finally { await new Promise<void>(resolve=>server.close(()=>resolve())); }
});
