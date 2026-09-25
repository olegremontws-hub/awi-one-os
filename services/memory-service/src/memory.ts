export type MemoryRecord = {
  memoryId: string; projectId: string; kind: 'fact'|'decision'|'lesson';
  content: Record<string, unknown>; sourceRefs: string[]; version: number; createdAt: string;
};

export interface MemoryStore { put(record: MemoryRecord): Promise<void>; }

export async function writeProjectMemory(store: MemoryStore, input: Omit<MemoryRecord,'memoryId'|'version'|'createdAt'>) {
  const record: MemoryRecord = { memoryId: crypto.randomUUID(), version: 1, createdAt: new Date().toISOString(), ...input };
  await store.put(record);
  return record;
}
