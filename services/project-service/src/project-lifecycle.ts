import type { GateSqlClient } from './human-gate-service.js';

export type ProjectStatus = 'intake'|'active'|'closed';

export async function getProject(db: GateSqlClient, projectId: string) {
  const result = await db.query('select id,project_code,name,status,created_at,updated_at from projects where id=$1', [projectId]);
  return result.rows?.[0] ?? null;
}

export async function changeProjectStatus(db: GateSqlClient, input: {
  projectId: string; status: ProjectStatus; actorId: string; correlationId: string;
}) {
  await db.query('BEGIN');
  try {
    await db.query('update projects set status=$1,updated_at=now() where id=$2', [input.status, input.projectId]);
    await db.query(
      'insert into audit_events (id,project_id,event_type,actor_type,actor_id,correlation_id,payload,occurred_at) values (gen_random_uuid(),$1,$2,$3,$4,$5,$6::jsonb,now())',
      [input.projectId, 'PROJECT_STATUS_CHANGED', 'human', input.actorId, input.correlationId, JSON.stringify({ status: input.status })],
    );
    await db.query('COMMIT');
    return { projectId: input.projectId, status: input.status };
  } catch (error) {
    await db.query('ROLLBACK'); throw error;
  }
}
