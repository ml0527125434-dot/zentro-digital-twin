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
 *   <ns>:index            -> JSON array of project ids
 *   <ns>:project:<id>     -> JSON of a ProjectSnapshot
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

// ---------------------------------------------------------------------------
// Shared key + read helpers (used by both the async port and the sync peek)
// ---------------------------------------------------------------------------

function indexKeyOf(ns: string): string {
  return `${ns}:index`;
}
function projectKeyOf(ns: string, id: string): string {
  return `${ns}:project:${id}`;
}

function readIndex(storage: StorageLike, ns: string): string[] {
  const raw = storage.getItem(indexKeyOf(ns));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function readSnapshot(storage: StorageLike, ns: string, id: string): ProjectSnapshot | null {
  const raw = storage.getItem(projectKeyOf(ns, id));
  if (!raw) return null;
  try {
    return parseProjectSnapshot(JSON.parse(raw));
  } catch {
    return null; // corrupt entry -> treat as absent
  }
}

function latestOf(storage: StorageLike, ns: string): ProjectSnapshot | null {
  let latest: ProjectSnapshot | null = null;
  for (const id of readIndex(storage, ns)) {
    const snap = readSnapshot(storage, ns, id);
    if (snap && (!latest || snap.savedAt > latest.savedAt)) latest = snap;
  }
  return latest;
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  return storage ?? globalThis.localStorage ?? null;
}

// ---------------------------------------------------------------------------
// Availability probe
// ---------------------------------------------------------------------------

/** True when a usable Web Storage backend is present in this environment. */
export function isLocalStorageAvailable(storage?: StorageLike): boolean {
  try {
    const s = resolveStorage(storage);
    if (!s) return false;
    const probe = '__zentro_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Synchronous peek — for eager hydration in the composition/bootstrap layer
// (NOT part of the ProjectRepository port; the Builder/business logic never
//  uses it — only the app's startup wiring does).
// ---------------------------------------------------------------------------

export function peekLatestSnapshotSync(
  options: LocalStorageRepositoryOptions = {},
): ProjectSnapshot | null {
  const storage = resolveStorage(options.storage);
  if (!storage) return null;
  try {
    return latestOf(storage, options.namespace ?? DEFAULT_NAMESPACE);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The async ProjectRepository adapter
// ---------------------------------------------------------------------------

export function createLocalStorageProjectRepository(
  options: LocalStorageRepositoryOptions = {},
): ProjectRepository {
  const ns = options.namespace ?? DEFAULT_NAMESPACE;
  const storage = resolveStorage(options.storage);
  if (!storage) {
    throw new Error(
      'createLocalStorageProjectRepository: no Web Storage available. ' +
        'Use createInMemoryProjectRepository() as a fallback.',
    );
  }

  function writeIndex(ids: string[]): void {
    storage!.setItem(indexKeyOf(ns), JSON.stringify([...new Set(ids)]));
  }

  return {
    async save(snapshot) {
      storage!.setItem(projectKeyOf(ns, snapshot.project.id), snapshotToJson(snapshot));
      const ids = readIndex(storage!, ns);
      if (!ids.includes(snapshot.project.id)) {
        writeIndex([...ids, snapshot.project.id]);
      }
    },

    async load(projectId) {
      return readSnapshot(storage!, ns, projectId);
    },

    async loadLatest() {
      return latestOf(storage!, ns);
    },

    async remove(projectId) {
      storage!.removeItem(projectKeyOf(ns, projectId));
      writeIndex(readIndex(storage!, ns).filter((id) => id !== projectId));
    },

    async list() {
      const summaries: ProjectSummary[] = [];
      for (const id of readIndex(storage!, ns)) {
        const snap = readSnapshot(storage!, ns, id);
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
