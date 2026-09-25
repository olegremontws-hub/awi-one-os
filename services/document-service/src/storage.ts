import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface ObjectStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly root = process.env.AWI_OBJECT_ROOT ?? '.awi-objects') {}
  async put(key: string, bytes: Uint8Array) {
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }
  async get(key: string) { return readFile(join(this.root, key)); }
}
