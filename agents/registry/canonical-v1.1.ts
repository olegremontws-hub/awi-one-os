export type RuntimeMode = 'system-control'|'governance'|'on-demand'|'persistent-control'|'human-interface';

export type AgentProfile = {
  id: string;
  department?: string;
  role: string;
  runtimeMode: RuntimeMode;
  mission: string;
};

export const SYSTEM_CONTROL: AgentProfile[] = [
  { id: 'SOL', role: 'SOL', runtimeMode: 'human-interface', mission: 'User-facing conversational interface for AWI ONE.' },
  { id: 'A-001', role: 'AI Director', runtimeMode: 'persistent-control', mission: 'Control goals, outcomes and executive escalation.' },
  { id: 'A-002', role: 'AI Dispatcher / Orchestrator', runtimeMode: 'persistent-control', mission: 'Dispatch work through the D-024 orchestration runtime.' },
];

export const VS001_AGENTS: AgentProfile[] = [
  { id: 'PS-A003', department: 'D-002', role: 'AI Business Analyst', runtimeMode: 'on-demand', mission: 'Structure project requirements and missing information.' },
  { id: 'OR-A003', department: 'D-024', role: 'Process Orchestrator', runtimeMode: 'persistent-control', mission: 'Run the project intake workflow.' },
  { id: 'OR-A004', department: 'D-024', role: 'Multi-Agent Orchestrator', runtimeMode: 'persistent-control', mission: 'Coordinate specialist agent invocations.' },
  { id: 'OR-A009', department: 'D-024', role: 'Approval & Decision Gateway', runtimeMode: 'persistent-control', mission: 'Enforce H0-H4 decision gates.' },
  { id: 'DP-A008', department: 'D-021', role: 'Data Quality & Validation', runtimeMode: 'on-demand', mission: 'Validate extracted project data.' },
  { id: 'KM-A003', department: 'D-025', role: 'Knowledge Ingestion', runtimeMode: 'on-demand', mission: 'Prepare approved artifacts for corporate memory.' },
  { id: 'KM-A006', department: 'D-025', role: 'Project Memory', runtimeMode: 'on-demand', mission: 'Maintain project-scoped memory.' },
  { id: 'KM-A007', department: 'D-025', role: 'Decision Memory', runtimeMode: 'on-demand', mission: 'Persist decisions with evidence and causality.' },
  { id: 'AG-A004', department: 'D-018', role: 'Human-in-the-Loop Coordinator', runtimeMode: 'governance', mission: 'Apply human-in-the-loop policy.' },
  { id: 'EX-A006', department: 'D-031', role: 'Decision Support Agent', runtimeMode: 'on-demand', mission: 'Prepare executive decision briefs for the Round Table.' },
  { id: 'OR-A014', department: 'D-024', role: 'Orchestration Audit', runtimeMode: 'persistent-control', mission: 'Audit workflow execution and causal links.' },
];

export function getAgent(id: string): AgentProfile {
  const agent = [...SYSTEM_CONTROL, ...VS001_AGENTS].find(a => a.id === id);
  if (!agent) throw new Error(`UNKNOWN_AGENT:${id}`);
  return agent;
}
