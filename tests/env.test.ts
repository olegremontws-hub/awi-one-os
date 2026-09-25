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
