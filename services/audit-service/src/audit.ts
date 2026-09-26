export type AuditRecord = {
  eventId: string; projectId: string; eventType: string;
  actorType: 'human'|'agent'|'system'; actorId: string;
  correlationId: string; causationId?: string;
  evidenceRefs: string[]; payload: Record<string, unknown>; occurredAt: string;
};

export interface AuditStore { append(record: AuditRecord): Promise<void>; }

export async function recordAudit(store: AuditStore, record: Omit<AuditRecord,'eventId'|'occurredAt'>) {
  const full: AuditRecord = { eventId: crypto.randomUUID(), occurredAt: new Date().toISOString(), ...record };
  await store.append(full);
  return full;
}
