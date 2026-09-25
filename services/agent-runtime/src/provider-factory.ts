import type { ModelProvider } from './providers.js';
import { providerFromEnv } from './openai-compatible-provider.js';
import { DeterministicTestProvider } from './test-provider.js';

export function runtimeProviderFromEnv():ModelProvider {
  if(process.env.AWI_MODEL_PROVIDER === 'deterministic-test') {
    if(process.env.NODE_ENV !== 'test' && process.env.AWI_ALLOW_TEST_PROVIDER !== 'true') {
      throw new Error('TEST_MODEL_PROVIDER_FORBIDDEN');
    }
    return new DeterministicTestProvider();
  }
  return providerFromEnv();
}
