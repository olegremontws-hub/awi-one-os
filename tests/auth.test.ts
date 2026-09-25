import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize, authorizeProjectScope } from '../services/project-service/src/auth.js';

test('project role does not grant access without project membership', async () => {
  const auth = { actorId: 'user-1', roles: ['project-member'] };
  authorize(auth, 'project:write');
  const db = { async query() { return { rows: [] }; } };
  await assert.rejects(() => authorizeProjectScope(db, auth, crypto.randomUUID()), /PROJECT_ACCESS_DENIED/);
});

test('project membership grants scope after role authorization', async () => {
  const auth = { actorId: 'user-1', roles: ['project-reader'] };
  authorize(auth, 'project:read');
  const db = { async query() { return { rows: [{ role: 'member' }] }; } };
  await authorizeProjectScope(db, auth, crypto.randomUUID());
});

test('reader cannot mutate even with project scope', () => {
  assert.throws(() => authorize({ actorId: 'user-1', roles: ['project-reader'] }, 'project:write'), /AUTHORIZATION_REQUIRED/);
});
