import pg from 'pg';
export type { QueryClient, TransactionalDb } from '../../../packages/db/src/transaction.js';
export { withTransaction } from '../../../packages/db/src/transaction.js';

export function createPostgresPool() {
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString) throw new Error('DATABASE_URL is required');
  return new pg.Pool({
    connectionString,
    max:Number(process.env.PG_POOL_MAX ?? 10),
    ssl:process.env.PG_SSL==='true'?{rejectUnauthorized:false}:undefined,
  });
}
