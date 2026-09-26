export type Project = {
  id: string;
  projectCode: string;
  name: string;
  status: 'intake' | 'active' | 'closed';
  createdAt: string;
};

/**
 * Legacy entrypoint intentionally contains no HTTP listener or in-memory state.
 * The only project-service runtime is server.ts backed by PostgreSQL.
 */
export { createServer } from './server.js';
