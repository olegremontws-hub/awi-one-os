import type { RequirementsAnalysis } from '../../agent-runtime/src/structured-agent.js';
import { buildDecisionCard } from '../../decision-service/src/decision-card.js';
import { classifyHumanGate } from '../../workflow-engine/src/human-gates.js';

export function buildVS001Decision(input: {
  projectId: string;
  analysis: RequirementsAnalysis;
  evidenceRefs: string[];
}) {
  const critical = input.analysis.risks.some(r => r.severity === 'critical');
  const gate = classifyHumanGate({ professionalResponsibility: critical });
  return buildDecisionCard({
    projectId: input.projectId,
    title: 'Project Intake Decision',
    summary: input.analysis.projectSummary,
    facts: {
      requirements: input.analysis.requirements,
      missingInformation: input.analysis.missingInformation,
      assumptions: input.analysis.assumptions,
      confidence: input.analysis.confidence,
    },
    risks: input.analysis.risks.map((r, index) => ({
      code: `INTAKE-RISK-${index + 1}`,
      severity: r.severity,
      description: r.description,
    })),
    evidenceRefs: input.evidenceRefs,
    requestedDecision: critical ? 'Review critical intake risk before execution.' : undefined,
    humanGate: {
      level: gate,
      reason: critical ? 'Critical risk requires professional human authority.' : 'No protected action detected.',
      status: gate === 'H0' ? 'not_required' : 'pending',
    },
  });
}
