/**
 * Zentro Digital Twin — Project Repository PORT (Stage 35, P0-1)
 *
 * The single abstraction the Builder and app integration depend on for
 * persistence. The Builder MUST NOT know whether a snapshot lives in
 * localStorage, a JSON file, or a backend — it only knows this interface.
 *
 * Adapters implement it:
 *   - createLocalStorageProjectRepository()  → browser localStorage (default now)
 *   - createInMemoryProjectRepository()      → tests / SSR fallback
 *   - (future) createHttpProjectRepository() → backend; drop-in, zero Builder changes
 *
 * The interface is async on purpose. localStorage resolves synchronously, but a
 * backend will not — making the port async now means swapping adapters later
 * requires NO change to call sites.
 */

import type { ProjectSnapshot } from './project-snapshot.js';

export interface ProjectSummary {
  projectId: string;
  name: string;
  savedAt: string; // ISO8601
  schemaVersion: number;
}

export interface ProjectRepository {
  /** Persist (insert or replace) a snapshot, keyed by its project id. */
  save(snapshot: ProjectSnapshot): Promise<void>;

  /** Load a specific project's latest snapshot, or null if none stored. */
  load(projectId: string): Promise<ProjectSnapshot | null>;

  /** Load the most recently saved snapshot across all projects, or null. */
  loadLatest(): Promise<ProjectSnapshot | null>;

  /** Remove a project's stored snapshot. No-op if absent. */
  remove(projectId: string): Promise<void>;

  /** Lightweight listing for pickers/history without loading full snapshots. */
  list(): Promise<ProjectSummary[]>;
}
