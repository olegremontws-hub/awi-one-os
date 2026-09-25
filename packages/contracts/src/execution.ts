export type ExecutionNodeStatus = 'planned'|'ready'|'running'|'waiting_human'|'blocked'|'completed'|'failed';

export type ExecutionNode = {
  id: string;
  projectId: string;
  parentId?: string;
  kind: 'work_package'|'task'|'decision'|'human_action';
  title: string;
  status: ExecutionNodeStatus;
  assignedActorId?: string;
  dependencyIds: string[];
  inputRefs: string[];
  outputRefs: string[];
  evidenceRefs: string[];
  correlationId: string;
};

export type HumanAction = {
  id: string;
  projectId: string;
  executionNodeId: string;
  gate: 'H2'|'H3'|'H4';
  requestedFrom: string;
  reason: string;
  status: 'pending'|'approved'|'rejected'|'completed';
  evidenceRefs: string[];
};
