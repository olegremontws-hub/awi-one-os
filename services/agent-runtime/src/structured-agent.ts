import type { ModelProvider } from './providers.js';

export type RequirementsAnalysis = {
  projectSummary: string;
  requirements: Array<{ id: string; text: string; sourceRef: string }>;
  missingInformation: string[];
  risks: Array<{ severity: 'low'|'medium'|'high'|'critical'; description: string; sourceRef?: string }>;
  assumptions: string[];
  confidence: number;
};

export async function runPSA003(provider: ModelProvider, input: {
  documentText: string;
  evidenceRefs: string[];
}): Promise<RequirementsAnalysis> {
  const response = await provider.generate<RequirementsAnalysis>({
    system: 'You are PS-A003 AI Business Analyst in AWI-ONE-OS. Extract only supported project facts. Never invent missing facts. Return structured JSON.',
    input: JSON.stringify(input),
    jsonSchema: {
      type: 'object',
      required: ['projectSummary','requirements','missingInformation','risks','assumptions','confidence'],
    },
  });
  return response.output;
}
