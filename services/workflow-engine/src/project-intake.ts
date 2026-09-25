export type IntakeContext = {
  projectId: string;
  documentId: string;
  correlationId: string;
};

export type IntakeStep =
  | 'document_intelligence'
  | 'requirements_analysis'
  | 'risk_triage'
  | 'decision_briefing'
  | 'human_gate'
  | 'persist_outcome';

export const PROJECT_INTAKE_STEPS: IntakeStep[] = [
  'document_intelligence',
  'requirements_analysis',
  'risk_triage',
  'decision_briefing',
  'human_gate',
  'persist_outcome',
];

export function startProjectIntake(context: IntakeContext) {
  return {
    workflowKey: 'VS-001_PROJECT_INTAKE',
    status: 'running' as const,
    currentStep: PROJECT_INTAKE_STEPS[0],
    context,
    startedAt: new Date().toISOString(),
  };
}

export function requiresHumanGate(input: {
  criticalRiskCount: number;
  legalCommitment?: boolean;
  moneyMovement?: boolean;
  strategicChange?: boolean;
  professionalResponsibility?: boolean;
  physicalWorldAction?: boolean;
}) {
  return (
    input.criticalRiskCount > 0 ||
    Boolean(input.legalCommitment) ||
    Boolean(input.moneyMovement) ||
    Boolean(input.strategicChange) ||
    Boolean(input.professionalResponsibility) ||
    Boolean(input.physicalWorldAction)
  );
}
