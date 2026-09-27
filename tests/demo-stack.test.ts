import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('local demo is seeded, localhost-only and explicitly non-production',async()=>{
  const [compose,seed,readme]=await Promise.all([
    readFile('docker-compose.demo.yml','utf8'),
    readFile('demo/seed.sql','utf8'),
    readFile('README.md','utf8'),
  ]);
  assert.match(compose,/127\.0\.0\.1:3001:3001/);
  assert.match(compose,/NODE_ENV: ci/);
  assert.match(compose,/AWI_MODEL_PROVIDER: deterministic-test/);
  assert.match(compose,/service_completed_successfully/);
  assert.match(seed,/10000000-0000-4000-8000-000000000001/);
  assert.match(seed,/DOCUMENT_ANALYZED/);
  assert.match(seed,/contract_financial_events/);
  assert.match(readme,/do not expose this profile to a network/i);
});
