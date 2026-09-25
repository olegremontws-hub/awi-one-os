import { randomUUID } from 'node:crypto';
import http from 'node:http';

export type Project = {
  id: string;
  projectCode: string;
  name: string;
  status: 'intake' | 'active' | 'closed';
  createdAt: string;
};

const projects = new Map<string, Project>();

export function createProject(input: { projectCode: string; name: string }): Project {
  if (!input.projectCode?.trim() || !input.name?.trim()) {
    throw new Error('projectCode and name are required');
  }
  const project: Project = {
    id: randomUUID(),
    projectCode: input.projectCode.trim(),
    name: input.name.trim(),
    status: 'intake',
    createdAt: new Date().toISOString(),
  };
  projects.set(project.id, project);
  return project;
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ service: 'project-service', status: 'ok' }));
  }

  if (req.method === 'POST' && req.url === '/v1/projects') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const project = createProject(JSON.parse(body || '{}'));
        res.writeHead(201, { 'content-type': 'application/json' });
        res.end(JSON.stringify(project));
      } catch (error) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'invalid request' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(Number(process.env.PORT ?? 3001));
}
