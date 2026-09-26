export type RoundTableParticipant = {
  id: string;
  kind: 'human' | 'agent' | 'company';
  name: string;
  role?: string;
  status: 'available' | 'invoked' | 'waiting' | 'done';
};

export type DecisionCard = {
  projectId: string;
  title: string;
  summary: string;
  risks: string[];
  evidenceRefs: string[];
  humanGate?: {
    type: 'money' | 'legal' | 'strategic' | 'professional' | 'physical';
    status: 'pending' | 'approved' | 'rejected';
  };
};

export type RoundTableState = {
  projectId: string;
  projectName: string;
  participants: RoundTableParticipant[];
  activeDiscussion?: string;
  decisionCard?: DecisionCard;
};

export function createRoundTable(projectId: string, projectName: string): RoundTableState {
  return {
    projectId,
    projectName,
    participants: [],
  };
}
