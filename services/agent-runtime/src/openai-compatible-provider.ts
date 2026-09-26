import type { ModelProvider, ModelRequest, ModelResponse } from './providers.js';

export class OpenAICompatibleProvider implements ModelProvider {
  constructor(private readonly config: {
    apiKey: string;
    model: string;
    baseUrl?: string;
  }) {}

  async ready(): Promise<boolean> {
    const response = await fetch(`${this.config.baseUrl ?? 'https://api.openai.com/v1'}/models/${encodeURIComponent(this.config.model)}`, {
      headers: { authorization: `Bearer ${this.config.apiKey}` },
    });
    return response.ok;
  }

  async generate<T>(request: ModelRequest): Promise<ModelResponse<T>> {
    const response = await fetch(`${this.config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.input },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`MODEL_PROVIDER_HTTP_${response.status}`);
    const body = await response.json() as {
      model: string;
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const content = body.choices[0]?.message.content;
    if (!content) throw new Error('MODEL_PROVIDER_EMPTY_RESPONSE');

    return {
      model: body.model,
      output: JSON.parse(content) as T,
      usage: body.usage ? {
        inputTokens: body.usage.prompt_tokens,
        outputTokens: body.usage.completion_tokens,
      } : undefined,
    };
  }
}

export function providerFromEnv(): OpenAICompatibleProvider {
  const apiKey = process.env.AWI_LLM_API_KEY;
  const model = process.env.AWI_LLM_MODEL;
  if (!apiKey || !model) throw new Error('AWI_LLM_API_KEY and AWI_LLM_MODEL are required');
  return new OpenAICompatibleProvider({
    apiKey, model, baseUrl: process.env.AWI_LLM_BASE_URL,
  });
}
