export type ModelRequest = { system: string; input: string; jsonSchema?: Record<string, unknown> };
export type ModelResponse<T=unknown> = { model: string; output: T; usage?: { inputTokens: number; outputTokens: number } };

export interface ModelProvider {
  generate<T>(request: ModelRequest): Promise<ModelResponse<T>>;
  ready(): Promise<boolean>;
}

/**
 * Provider boundary. Production adapters (OpenAI or other approved models)
 * live behind this interface; API keys must come from the deployment secret store.
 */
export class UnconfiguredModelProvider implements ModelProvider {
  async ready() { return false; }
  async generate<T>(): Promise<ModelResponse<T>> {
    throw new Error('MODEL_PROVIDER_NOT_CONFIGURED');
  }
}
