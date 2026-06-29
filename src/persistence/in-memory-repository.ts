/**
 * Zentro Digital Twin — In-Memory Project Repository (Stage 35, P0-1)
 *
 * A ProjectRepository backed by a Map. Used by tests and as a safe fallback
 * when no browser storage is available (e.g. SSR or privacy-locked browsers).
 * Snapshots are deep-cloned in and out so callers can never mutate stored state.
 */

import type { ProjectSnapshot } from './project-snapshot.js';
import type { ProjectRepository, ProjectSummary } from './project-repository.js';

export function createInMemoryProjectRepository(): ProjectRepository {
  const store = new Map<string, ProjectSnapshot>();

  return {
    async save(snapshot) {
      store.set(snapshot.project.id, clone(snapshot));
    },

    async load(projectId) {
      const found = store.get(projectId);
      return found ? clone(found) : null;
    },

    async loadLatest() {
      let latest: ProjectSnapshot | null = null;
      for (const snap of store.values()) {
        if (!latest || snap.savedAt > latest.savedAt) latest = snap;
      }
      return latest ? clone(latest) : null;
    },

    async remove(projectId) {
      store.delete(projectId);
    },

    async list() {
      const summaries: ProjectSummary[] = [];
      for (const snap of store.values()) {
        summaries.push({
          projectId: snap.project.id,
          name: snap.project.name,
          savedAt: snap.savedAt,
          schemaVersion: snap.schemaVersion,
        });
      }
      return summaries.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
    },
  };
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}
