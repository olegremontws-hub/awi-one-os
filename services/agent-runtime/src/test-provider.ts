import type { ModelProvider, ModelRequest, ModelResponse } from './providers.js';

export class DeterministicTestProvider implements ModelProvider {
  async generate<T>(_request:ModelRequest):Promise<ModelResponse<T>> {
    return {
      model:'awi-ci-deterministic',
      output:{
        projectSummary:'Synthetic client project accepted for intake.',
        requirements:['Process the uploaded client requirements.'],
        missingInformation:[],
        assumptions:['Synthetic CI fixture.'],
        risks:[],
        confidence:0.99,
      } as T,
    };
  }
}
