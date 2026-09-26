import type { VS001PersistenceBundle, VS001Repository } from './vs001-persistence.js';

export class InMemoryVS001Repository implements VS001Repository {
  readonly bundles: VS001PersistenceBundle[] = [];
  async commit(bundle: VS001PersistenceBundle): Promise<void> {
    this.bundles.push(structuredClone(bundle));
  }
}
