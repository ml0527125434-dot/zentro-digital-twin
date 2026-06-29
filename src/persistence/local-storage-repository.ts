/**
 * Zentro Digital Twin — localStorage Project Repository (Stage 35, P0-1)
 *
 * Default persistence adapter for the browser. Implements the ProjectRepository
 * port over a Web Storage backend. The concrete storage is injectable so this
 * is unit-testable and SSR-safe:
 *   - In the browser, defaults to window.localStorage.
 *   - In tests, pass a fake StorageLike.
 *   - If no storage exists, callers should fall back to the in-memory adapter.
 *
 * Layout:
 *   <ns>:index            → JSON array of project ids
 *   <ns>:project:<id>     → JSON of a ProjectSnapshot
 *
 * Corrupt or unreadable entries are treated as absent rather than throwing, so a
 * single bad key can never brick the app on load.
 */

import {
  parseProjectSnapshot,
  snapshotToJson,
  type ProjectSnapshot,
} from './project-snapshot.js';
import type { ProjectRepository, ProjectSummary } from './project-repository.js';

/** Minimal subset of the Web Storage API this adapter needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalStorageRepositoryOptions {
  storage?: StorageLike;
  namespace?: string;
}

const DEFAULT_NAMESPACE = 'zentro';

/** True when a usable Web Storage backend is present in this environment. */
export function isLocalStorageAvailable(storage?: StorageLike): boolean {
  try {
    const s = storage ?? globalThis.localStorage;
    if (!s) return false;
    const probe = '__zentro_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function createLocalStorageProjectRepository(
  options: LocalStorageRepositoryOptions = {},
): ProjectRepository {
  const ns = options.namespace ?? DEFAULT_NAMESPACE;
  const storage = options.storage ?? globalThis.localStorage;
  if (!storage) {
    throw new Error(
      'createLocalStorageProjectRepository: no Web Storage available. ' +
        'Use createInMemoryProjectRepository() as a fallback.',
    );
  }

  const indexKey = `${ns}:index`;
  const projectKey = (id: string) => `${ns}:project:${id}`;

  function readIndex(): string[] {
    const raw = storage.getItem(indexKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  function writeIndex(ids: string[]): void {
    storage.setItem(indexKey, JSON.stringify([...new Set(ids)]));
  }

  function readSnapshot(id: string): ProjectSnapshot | null {
    const raw = storage.getItem(projectKey(id));
    if (!raw) return null;
    try {
      return parseProjectSnapshot(JSON.parse(raw));
    } catch {
      return null; // corrupt entry → treat as absent
    }
  }

  return {
    async save(snapshot) {
      storage.setItem(projectKey(snapshot.project.id), snapshotToJson(snapshot));
      const ids = readIndex();
      if (!ids.includes(snapshot.project.id)) {
        writeIndex([...ids, snapshot.project.id]);
      }
    },

    async load(projectId) {
      return readSnapshot(projectId);
    },

    async loadLatest() {
      let latest: ProjectSnapshot | null = null;
      for (const id of readIndex()) {
        const snap = readSnapshot(id);
        if (snap && (!latest || snap.savedAt > latest.savedAt)) latest = snap;
      }
      return latest;
    },

    async remove(projectId) {
      storage.removeItem(projectKey(projectId));
      writeIndex(readIndex().filter((id) => id !== projectId));
    },

    async list() {
      const summaries: ProjectSummary[] = [];
      for (const id of readIndex()) {
        const snap = readSnapshot(id);
        if (snap) {
          summaries.push({
            projectId: snap.project.id,
            name: snap.project.name,
            savedAt: snap.savedAt,
            schemaVersion: snap.schemaVersion,
          });
        }
      }
      return summaries.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
    },
  };
}
