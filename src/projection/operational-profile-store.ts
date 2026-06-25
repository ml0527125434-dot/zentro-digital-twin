/**
 * Zentro Digital Twin — OperationalProfileStore (Stage 7)
 *
 * Runtime store for OperationalProfile data.
 * Owned and populated by the application bootstrap layer — outside React.
 * Projection reads from it; React and Builder never write to it.
 */

import type { OperationalProfile } from '../domain/types.js';

export interface OperationalProfileStore {
  get(profileId: string): OperationalProfile | undefined;
  set(profile: OperationalProfile): void;
  setMany(profiles: OperationalProfile[]): void;
  listAll(): OperationalProfile[];
}

export function createInMemoryOperationalProfileStore(): OperationalProfileStore {
  const profiles = new Map<string, OperationalProfile>();

  return {
    get(profileId) {
      return profiles.get(profileId);
    },
    set(profile) {
      profiles.set(profile.id, profile);
    },
    setMany(items) {
      for (const p of items) profiles.set(p.id, p);
    },
    listAll() {
      return [...profiles.values()];
    },
  };
}
