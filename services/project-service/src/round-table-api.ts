import type { DecisionCard } from '../../decision-service/src/decision-card.js';
import { buildRoundTableSnapshot, type RoundTableSnapshot as ProjectSnapshot } from './round-table-snapshot.js';

export type DecisionRoundTableSnapshot = {
  projectId: string;
  decisionCards: DecisionCard[];
  pendingHumanActions: Array<{ decisionId: string; gate: 'H2'|'H3'|'H4'; reason: string }>;
  timeline: Array<{ type: string; actorId: string; occurredAt: string; summary: string }>;
};

export function createRoundTableSnapshot(projectId: string, cards: DecisionCard[]): DecisionRoundTableSnapshot {
  return {
    projectId,
    decisionCards: cards,
    pendingHumanActions: cards
      .filter(c => c.humanGate.status === 'pending' && ['H2','H3','H4'].includes(c.humanGate.level))
      .map(c => ({ decisionId: c.id, gate: c.humanGate.level as 'H2'|'H3'|'H4', reason: c.humanGate.reason })),
    timeline: [],
  };
}

export interface RoundTableRepository {
  load(projectId: string): Promise<Omit<ProjectSnapshot, 'attention'> | undefined>;
}

export class RoundTableApi {
  constructor(private readonly repo: RoundTableRepository) {}
  async getProject(projectId: string) {
    if (!projectId) throw new Error('PROJECT_ID_REQUIRED');
    const data = await this.repo.load(projectId);
    if (!data) return { status: 404 as const, body: { error: 'PROJECT_NOT_FOUND' } };
    return { status: 200 as const, body: buildRoundTableSnapshot(data) };
  }
}
