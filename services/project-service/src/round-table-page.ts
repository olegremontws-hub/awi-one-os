import type { GateSqlClient } from './human-gate-service.js';
import { getProject } from './project-lifecycle.js';
import { getRoundTableState } from './round-table-query.js';
import { renderProjectRoundTable } from '../../../apps/round-table/src/project-screen.js';

export async function getProjectRoundTablePage(db: GateSqlClient, projectId: string) {
  const project = await getProject(db, projectId);
  if (!project) {
    return {
      status: 404 as const,
      body: '<!doctype html><html lang="ru"><meta charset="utf-8"><title>AWI ONE — проект не найден</title><body>PROJECT_NOT_FOUND</body></html>',
    };
  }
  const snapshot = await getRoundTableState(db, projectId);
  return {
    status: 200 as const,
    body: renderProjectRoundTable({
      projectName: String(project.name ?? projectId),
      snapshot,
    }),
  };
}
