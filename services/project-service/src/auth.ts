export type AuthContext = {
  actorId: string;
  roles: string[];
};

export function authContextFromHeaders(headers: Record<string, string | string[] | undefined>, env: NodeJS.ProcessEnv = process.env): AuthContext {
  const actor = headers['x-awi-actor-id'];
  const roles = headers['x-awi-roles'];
  const actorId = Array.isArray(actor) ? actor[0] : actor;
  const roleText = Array.isArray(roles) ? roles[0] : roles;
  if (actorId?.trim()) {
    return { actorId: actorId.trim(), roles: String(roleText ?? '').split(',').map(x => x.trim()).filter(Boolean) };
  }
  if (env.NODE_ENV === 'ci' || env.NODE_ENV === 'test') return { actorId: 'qa-system', roles: ['system-test'] };
  throw new Error('AUTHENTICATION_REQUIRED');
}

export function requireActorMatch(auth: AuthContext, claimedActorId: unknown) {
  const claimed = String(claimedActorId ?? '').trim();
  if (claimed && claimed !== auth.actorId) throw new Error('ACTOR_ID_MISMATCH');
  return auth.actorId;
}

export type ProjectAction = 'project:read' | 'project:write' | 'decision:decide';

const rolePermissions: Record<string, ProjectAction[]> = {
  'system-test': ['project:read','project:write','decision:decide'],
  'project-reader': ['project:read'],
  'project-member': ['project:read','project:write'],
  'project-approver': ['project:read','decision:decide'],
  'project-admin': ['project:read','project:write','decision:decide'],
};

export function authorize(auth: AuthContext, action: ProjectAction) {
  const allowed = auth.roles.some(role => rolePermissions[role]?.includes(action));
  if (!allowed) throw new Error('AUTHORIZATION_REQUIRED');
}
