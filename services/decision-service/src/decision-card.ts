export type DecisionCard = {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  facts: Record<string, unknown>;
  risks: Array<{ code: string; severity: 'low'|'medium'|'high'|'critical'; description: string }>;
  evidenceRefs: string[];
  requestedDecision?: string;
  humanGate: { level: 'H0'|'H1'|'H2'|'H3'|'H4'; reason: string; status: 'not_required'|'pending'|'approved'|'rejected' };
};

export function buildDecisionCard(input: Omit<DecisionCard,'id'>): DecisionCard {
  return { id: crypto.randomUUID(), ...input };
}
