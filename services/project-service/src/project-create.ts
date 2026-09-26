import type { GateSqlClient } from './human-gate-service.js';

export async function createDurableProject(db: GateSqlClient, input: { projectCode:string; name:string }) {
  const projectCode=input.projectCode.trim(), name=input.name.trim();
  if(!projectCode || !name) throw new Error('projectCode and name are required');
  const id=crypto.randomUUID();
  const result=await db.query(
    'insert into projects (id,project_code,name,status) values ($1,$2,$3,$4) returning id,project_code,name,status,created_at,updated_at',
    [id,projectCode,name,'intake'],
  );
  return result.rows?.[0] ?? { id, project_code:projectCode, name, status:'intake' };
}
