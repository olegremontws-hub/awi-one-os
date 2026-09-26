import type pg from 'pg';

export interface QueryClient {
  query(sql:string,params?:unknown[]):Promise<{rows?:Array<Record<string,unknown>>;rowCount?:number|null}>;
}

export interface TransactionalDb extends QueryClient {
  connect():Promise<pg.PoolClient>;
}

export async function withTransaction<T>(db:TransactionalDb, work:(client:pg.PoolClient)=>Promise<T>):Promise<T> {
  const client=await db.connect();
  try {
    await client.query('BEGIN');
    const result=await work(client);
    await client.query('COMMIT');
    return result;
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
