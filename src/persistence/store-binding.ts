/**
 * Zentro Digital Twin — Persistence ↔ Store binding (Stage 35, P0-1)
 *
 * The ONLY module in the persistence layer that imports engine/store internals.
 * It adapts the pure SnapshotSource/SnapshotSink seams to the live runtime
 * stores, so the rest of persistence stays dependency-light and the Builder
 * stays unaware of persistence entirely.
 */

import type { EngineStores } from '../engine/graph-engine.js';
import { createInMemoryGraphStore } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import {
  createInMemoryOperationalProfileStore,
  type OperationalProfileStore,
} from '../projection/operational-profile-store.js';
import {
  serializeProjectSnapshot,
  applyProjectSnapshot,
  type ProjectSnapshot,
  type SnapshotSource,
  type SnapshotSink,
} from './project-snapshot.js';

/** A read view over the live stores for serialization. */
export function snapshotSourceFromStores(
  stores: EngineStores,
  profileStore: OperationalProfileStore,
): SnapshotSource {
  return {
    getProject: (projectId) => stores.graph.getProject(projectId),
    getComponents: (projectId) => stores.graph.getComponents(projectId),
    getConnections: (projectId) => stores.graph.getConnections(projectId),
    listProfiles: () => profileStore.listAll(),
  };
}

/** A write view over live stores for applying a snapshot. */
export function snapshotSinkFromStores(
  stores: EngineStores,
  profileStore: OperationalProfileStore,
): SnapshotSink {
  return {
    setProject: (project) => stores.graph.setProject(project),
    setComponent: (component) => stores.graph.setComponent(component),
    setConnection: (connection) => stores.graph.setConnection(connection),
    setProfiles: (profiles) => profileStore.setMany(profiles),
  };
}

/** Convenience: serialize the current CONFIG graph for a project. */
export function captureSnapshot(
  stores: EngineStores,
  profileStore: OperationalProfileStore,
  projectId: string,
): ProjectSnapshot {
  return serializeProjectSnapshot(snapshotSourceFromStores(stores, profileStore), projectId);
}

export interface RestoredStores {
  stores: EngineStores;
  profileStore: OperationalProfileStore;
  projectId: string;
}

/**
 * Build a fresh, fully-populated set of runtime stores from a snapshot.
 * Returns brand-new stores rather than mutating existing ones, so a load is a
 * clean replacement with no leftover components/connections from a prior model.
 *
 * Note: TELEMETRY (liveStore) and ALARM stores are intentionally NOT restored —
 * those are runtime/observed state, not part of the saved building model.
 */
export function restoreStoresFromSnapshot(snapshot: ProjectSnapshot): RestoredStores {
  const stores: EngineStores = {
    graph: createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events: createInMemoryEventStore(),
  };
  const profileStore = createInMemoryOperationalProfileStore();

  applyProjectSnapshot(snapshot, snapshotSinkFromStores(stores, profileStore));

  return { stores, profileStore, projectId: snapshot.project.id };
}
