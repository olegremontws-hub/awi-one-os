import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const db = new pg.Pool({ connectionString, ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
await db.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
for (const name of (await readdir(resolve('database/migrations'))).filter(x => x.endsWith('.sql')).sort()) {
  const exists = await db.query('select 1 from schema_migrations where name=$1', [name]);
  if (exists.rowCount) continue;
  const sql = await readFile(resolve('database/migrations', name), 'utf8');
  const client = await db.connect();
  try {
    await client.query('BEGIN'); await client.query(sql);
    await client.query('insert into schema_migrations(name) values($1)', [name]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
await db.end();
