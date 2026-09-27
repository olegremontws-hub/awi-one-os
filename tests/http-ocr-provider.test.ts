import test from 'node:test';
import assert from 'node:assert/strict';
import {HttpOcrBridgeProvider,ocrProviderFromEnv} from '../services/document-service/src/http-ocr-provider.js';

test('OCR provider factory stays disabled when no provider is configured',()=>{
  assert.equal(ocrProviderFromEnv({}),undefined);
});

test('HTTP OCR bridge checks readiness and sends document without exposing key in payload',async()=>{
  const calls:Array<{url:string;init?:RequestInit}>=[];
  const fake=async(input:string|URL,init?:RequestInit)=>{
    calls.push({url:String(input),init});
    if(String(input).endsWith('/ready'))return new Response('{}',{status:200});
    return new Response(JSON.stringify({provider:'bridge',pipelineVersion:'2026-09',pages:[{pageNumber:1,text:'Договор',confidence:.94}]}),{status:200,headers:{'content-type':'application/json'}});
  };
  const provider=new HttpOcrBridgeProvider('https://ocr.internal/','secret-key',5000,fake);
  assert.equal(await provider.ready(),true);
  const result=await provider.extract({bytes:Buffer.from('scan'),filename:'scan.pdf',mimeType:'application/pdf'});
  assert.equal(result.pages[0]?.text,'Договор');
  assert.equal(calls[0]?.url,'https://ocr.internal/ready');
  assert.equal(new Headers(calls[1]?.init?.headers).get('authorization'),'Bearer secret-key');
  const body=String(calls[1]?.init?.body);
  assert.equal(body.includes('secret-key'),false);
  assert.match(body,/"filename":"scan.pdf"/);
});

test('OCR provider factory validates explicit bridge configuration',()=>{
  assert.throws(()=>ocrProviderFromEnv({OCR_PROVIDER:'http-bridge'}),/MISSING_ENV:OCR_ENDPOINT/);
  assert.throws(()=>ocrProviderFromEnv({OCR_PROVIDER:'other',OCR_ENDPOINT:'https:\/\/x'}),/UNSUPPORTED_OCR_PROVIDER/);
  const provider=ocrProviderFromEnv({OCR_PROVIDER:'http-bridge',OCR_ENDPOINT:'https:\/\/ocr.internal',OCR_TIMEOUT_MS:'5000'},async()=>new Response('{}',{status:200}));
  assert.ok(provider);
});
