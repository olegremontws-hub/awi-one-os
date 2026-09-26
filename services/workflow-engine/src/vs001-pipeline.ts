import type { DocumentAnalysis } from '../../document-intelligence/src/analyze.js';
import { classifyHumanGate, type GateLevel } from './human-gates.js';

export type PipelineStage = {
  agentId: string;
  purpose: string;
  status: 'ready'|'waiting_human'|'completed';
};

export type VS001Plan = {
  projectId: string;
  documentId: string;
  gate: GateLevel;
  stages: PipelineStage[];
  evidenceRefs: string[];
};

export function planVS001(input: {
  projectId: string;
  analysis: DocumentAnalysis;
  externalCommunication?: boolean;
  money?: boolean;
  legalWill?: boolean;
  strategic?: boolean;
  professionalResponsibility?: boolean;
  physicalWorld?: boolean;
}): VS001Plan {
  const gate = classifyHumanGate(input);
  const stages: PipelineStage[] = [
    { agentId: 'PS-A003', purpose: 'requirements_analysis', status: 'ready' },
    { agentId: 'DP-A008', purpose: 'data_quality_validation', status: 'ready' },
    { agentId: 'EX-A006', purpose: 'decision_support', status: 'ready' },
    { agentId: 'OR-A009', purpose: 'approval_decision_gateway', status: gate === 'H0' ? 'completed' : 'waiting_human' },
    { agentId: 'KM-A007', purpose: 'decision_memory', status: gate === 'H0' ? 'ready' : 'waiting_human' },
    { agentId: 'OR-A014', purpose: 'orchestration_audit', status: 'ready' },
  ];

  return {
    projectId: input.projectId,
    documentId: input.analysis.documentId,
    gate,
    stages,
    evidenceRefs: input.analysis.evidenceRefs,
  };
}
