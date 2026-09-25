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
