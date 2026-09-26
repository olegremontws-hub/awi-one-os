import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRuntimeEnv } from '../services/project-service/src/env.js';

test('runtime env requires database and model credentials', () => {
  assert.throws(() => validateRuntimeEnv({}), /DATABASE_URL.*AWI_LLM_API_KEY.*AWI_LLM_MODEL/);
});
test('runtime env accepts deployment configuration', () => {
  const config = validateRuntimeEnv({ DATABASE_URL:'postgres://db', AWI_LLM_API_KEY:'secret', AWI_LLM_MODEL:'model', PORT:'3001' });
  assert.equal(config.port, 3001);
});

test('runtime env validates configured OCR bridge',()=>{
  assert.throws(()=>validateRuntimeEnv({DATABASE_URL:'postgres://db',AWI_LLM_API_KEY:'secret',AWI_LLM_MODEL:'model',OCR_PROVIDER:'http-bridge'}),/MISSING_ENV:OCR_ENDPOINT/);
  assert.throws(()=>validateRuntimeEnv({DATABASE_URL:'postgres://db',AWI_LLM_API_KEY:'secret',AWI_LLM_MODEL:'model',OCR_PROVIDER:'other',OCR_ENDPOINT:'https://ocr'}),/UNSUPPORTED_OCR_PROVIDER/);
  const config=validateRuntimeEnv({DATABASE_URL:'postgres://db',AWI_LLM_API_KEY:'secret',AWI_LLM_MODEL:'model',OCR_PROVIDER:'http-bridge',OCR_ENDPOINT:'https://ocr',OCR_TIMEOUT_MS:'5000'});
  assert.equal(config.ocrProvider,'http-bridge');assert.equal(config.ocrEndpoint,'https://ocr');
});
