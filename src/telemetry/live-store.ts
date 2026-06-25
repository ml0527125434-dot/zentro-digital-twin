import type { LiveSample } from '../domain/types.js';

export interface LiveStore {
  set(bindingId: string, sample: LiveSample): void;
  get(bindingId: string): LiveSample | undefined;
  /** Remove all samples */
  clear(): void;
}

export function createInMemoryLiveStore(): LiveStore {
  const store = new Map<string, LiveSample>();
  return {
    set(bindingId, sample) { store.set(bindingId, sample); },
    get(bindingId)         { return store.get(bindingId); },
    clear()                { store.clear(); },
  };
}
