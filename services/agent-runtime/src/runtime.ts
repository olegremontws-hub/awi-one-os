export type AgentDefinition = {
  agentId: string;
  role: string;
  mission: string;
  allowedTools: string[];
  humanGate: 'none' | 'money' | 'legal' | 'strategic' | 'professional' | 'physical';
};

export type AgentInvocation<TInput = unknown> = {
  invocationId: string;
  projectId: string;
  agent: AgentDefinition;
  input: TInput;
  correlationId: string;
};

export type AgentResult<TOutput = unknown> = {
  invocationId: string;
  agentId: string;
  status: 'completed' | 'needs_human' | 'failed';
  output?: TOutput;
  evidence: Array<{ type: string; ref: string }>;
  completedAt: string;
};

export async function invokeAgent<TInput, TOutput>(
  invocation: AgentInvocation<TInput>,
  handler: (input: TInput) => Promise<TOutput>,
): Promise<AgentResult<TOutput>> {
  if (invocation.agent.humanGate !== 'none') {
    return {
      invocationId: invocation.invocationId,
      agentId: invocation.agent.agentId,
      status: 'needs_human',
      evidence: [],
      completedAt: new Date().toISOString(),
    };
  }

  try {
    const output = await handler(invocation.input);
    return {
      invocationId: invocation.invocationId,
      agentId: invocation.agent.agentId,
      status: 'completed',
      output,
      evidence: [],
      completedAt: new Date().toISOString(),
    };
  } catch {
    return {
      invocationId: invocation.invocationId,
      agentId: invocation.agent.agentId,
      status: 'failed',
      evidence: [],
      completedAt: new Date().toISOString(),
    };
  }
}
