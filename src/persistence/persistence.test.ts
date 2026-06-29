/**
 * Zentro Digital Twin — Persistence layer tests (Stage 35, P0-1)
 */

import { describe, it, expect } from 'vitest';
import type { Project, Component, Connection, OperationalProfile } from '../domain/types.js';
import {
  serializeProjectSnapshot,
  parseProjectSnapshot,
  snapshotToJson,
  snapshotFromJson,
  SnapshotError,
  CURRENT_SCHEMA_VERSION,
  type ProjectSnapshot,
  type SnapshotSource,
} from './project-snapshot.js';
import { createInMemoryProjectRepository } from './in-memory-repository.js';
import {
  createLocalStorageProjectRepository,
  isLocalStorageAvailable,
  type StorageLike,
} from './local-storage-repository.js';
import { captureSnapshot, restoreStoresFromSnapshot } from './store-binding.js';
import { createInMemoryGraphStore } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createInMemoryOperationalProfileStore } from '../projection/operational-profile-store.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'proj_test';

function makeProject(): Project {
  return { id: PROJECT_ID, name: 'בניין מגורים', siteType: 'residential' };
}

function makeComponent(id: string, type = 'storage_tank'): Component {
  return {
    id,
    type,
    name: `רכיב ${id}`,
    projectId: PROJECT_ID,
    position: { x: 100, y: 120 },
    bindings: [],
  };
}

function makeConnection(id: string, from: string, to: string): Connection {
  return {
    id,
    projectId: PROJECT_ID,
    fromComponentId: from,
    fromPortId: 'out_hot',
    toComponentId: to,
    toPortId: 'in_hot',
    medium: 'hot_water',
    topologicalDirection: 'forward',
  };
}

function makeProfile(): OperationalProfile {
  return { id: 'profile_1', appliesToType: 'storage_tank', scope: 'type_default', metrics: [] };
}

function makeSource(): SnapshotSource {
  const project = makeProject();
  const components = [makeComponent('cmp_a'), makeComponent('cmp_b', 'heat_pump')];
  const connections = [makeConnection('cn_1', 'cmp_b', 'cmp_a')];
  const profiles = [makeProfile()];
  return {
    getProject: (pid) => (pid === PROJECT_ID ? project : undefined),
    getComponents: () => components,
    getConnections: () => connections,
    listProfiles: () => profiles,
  };
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

describe('project-snapshot — serialize', () => {
  it('captures project, components, connections and profiles', () => {
    const snap = serializeProjectSnapshot(makeSource(), PROJECT_ID, () => '2026-06-29T00:00:00.000Z');
    expect(snap.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snap.savedAt).toBe('2026-06-29T00:00:00.000Z');
    expect(snap.project.id).toBe(PROJECT_ID);
    expect(snap.components).toHaveLength(2);
    expect(snap.connections).toHaveLength(1);
    expect(snap.operationalProfiles).toHaveLength(1);
  });

  it('throws when the project does not exist', () => {
    expect(() => serializeProjectSnapshot(makeSource(), 'missing')).toThrow(SnapshotError);
  });

  it('deep-clones so the snapshot does not alias live objects', () => {
    const source = makeSource();
    const snap = serializeProjectSnapshot(source, PROJECT_ID);
    snap.components[0]!.name = 'MUTATED';
    expect(source.getComponents(PROJECT_ID)[0]!.name).not.toBe('MUTATED');
  });
});

// ---------------------------------------------------------------------------
// JSON round-trip + parse/validation
// ---------------------------------------------------------------------------

describe('project-snapshot — JSON + validation', () => {
  it('round-trips through JSON', () => {
    const snap = serializeProjectSnapshot(makeSource(), PROJECT_ID);
    const restored = snapshotFromJson(snapshotToJson(snap));
    expect(restored).toEqual(snap);
  });

  it('rejects non-JSON text', () => {
    expect(() => snapshotFromJson('{not json')).toThrow(SnapshotError);
  });

  it('rejects a missing schemaVersion', () => {
    expect(() => parseProjectSnapshot({ project: makeProject(), components: [], connections: [] }))
      .toThrow(/schemaVersion/);
  });

  it('rejects a future schemaVersion', () => {
    const future = { schemaVersion: CURRENT_SCHEMA_VERSION + 1, project: makeProject(), components: [], connections: [] };
    expect(() => parseProjectSnapshot(future)).toThrow(/newer/);
  });

  it('rejects a missing project', () => {
    expect(() => parseProjectSnapshot({ schemaVersion: 1, components: [], connections: [] }))
      .toThrow(/project/);
  });

  it('rejects components whose projectId mismatches', () => {
    const bad = {
      schemaVersion: 1,
      project: makeProject(),
      components: [{ id: 'x', type: 't', projectId: 'other' }],
      connections: [],
    };
    expect(() => parseProjectSnapshot(bad)).toThrow(/projectId/);
  });

  it('accepts a snapshot with no operationalProfiles field (defaults to [])', () => {
    const ok = { schemaVersion: 1, savedAt: 'x', project: makeProject(), components: [], connections: [] };
    const parsed = parseProjectSnapshot(ok);
    expect(parsed.operationalProfiles).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// In-memory repository
// ---------------------------------------------------------------------------

describe('in-memory repository', () => {
  it('saves and loads a snapshot', async () => {
    const repo = createInMemoryProjectRepository();
    const snap = serializeProjectSnapshot(makeSource(), PROJECT_ID);
    await repo.save(snap);
    const loaded = await repo.load(PROJECT_ID);
    expect(loaded?.project.id).toBe(PROJECT_ID);
  });

  it('returns null for an unknown project', async () => {
    const repo = createInMemoryProjectRepository();
    expect(await repo.load('nope')).toBeNull();
  });

  it('loadLatest returns the most recently saved', async () => {
    const repo = createInMemoryProjectRepository();
    const older: ProjectSnapshot = { ...serializeProjectSnapshot(makeSource(), PROJECT_ID), savedAt: '2026-01-01T00:00:00.000Z' };
    const newer: ProjectSnapshot = {
      ...serializeProjectSnapshot(makeSource(), PROJECT_ID),
      project: { ...makeProject(), id: 'proj_b', name: 'newer' },
      components: [], connections: [],
      savedAt: '2026-12-31T00:00:00.000Z',
    };
    await repo.save(older);
    await repo.save(newer);
    expect((await repo.loadLatest())?.project.id).toBe('proj_b');
  });

  it('remove deletes and list reflects it', async () => {
    const repo = createInMemoryProjectRepository();
    await repo.save(serializeProjectSnapshot(makeSource(), PROJECT_ID));
    expect(await repo.list()).toHaveLength(1);
    await repo.remove(PROJECT_ID);
    expect(await repo.list()).toHaveLength(0);
    expect(await repo.load(PROJECT_ID)).toBeNull();
  });

  it('does not alias stored snapshots (mutating the result is safe)', async () => {
    const repo = createInMemoryProjectRepository();
    await repo.save(serializeProjectSnapshot(makeSource(), PROJECT_ID));
    const a = await repo.load(PROJECT_ID);
    a!.project.name = 'changed';
    const b = await repo.load(PROJECT_ID);
    expect(b!.project.name).not.toBe('changed');
  });
});

// ---------------------------------------------------------------------------
// localStorage repository (with a fake StorageLike)
// ---------------------------------------------------------------------------

function fakeStorage(): StorageLike & { _map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    _map: map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

describe('localStorage repository', () => {
  it('isLocalStorageAvailable detects a working backend', () => {
    expect(isLocalStorageAvailable(fakeStorage())).toBe(true);
  });

  it('saves, loads, lists and removes via the port', async () => {
    const storage = fakeStorage();
    const repo = createLocalStorageProjectRepository({ storage, namespace: 'test' });
    await repo.save(serializeProjectSnapshot(makeSource(), PROJECT_ID));

    expect((await repo.load(PROJECT_ID))?.project.id).toBe(PROJECT_ID);
    expect(await repo.list()).toHaveLength(1);
    expect((await repo.loadLatest())?.project.id).toBe(PROJECT_ID);

    await repo.remove(PROJECT_ID);
    expect(await repo.load(PROJECT_ID)).toBeNull();
    expect(await repo.list()).toHaveLength(0);
  });

  it('persists across repository instances over the same storage', async () => {
    const storage = fakeStorage();
    const repoA = createLocalStorageProjectRepository({ storage, namespace: 'test' });
    await repoA.save(serializeProjectSnapshot(makeSource(), PROJECT_ID));
    const repoB = createLocalStorageProjectRepository({ storage, namespace: 'test' });
    expect((await repoB.load(PROJECT_ID))?.project.id).toBe(PROJECT_ID);
  });

  it('treats a corrupt entry as absent instead of throwing', async () => {
    const storage = fakeStorage();
    const repo = createLocalStorageProjectRepository({ storage, namespace: 'test' });
    await repo.save(serializeProjectSnapshot(makeSource(), PROJECT_ID));
    storage._map.set('test:project:' + PROJECT_ID, '{corrupt');
    expect(await repo.load(PROJECT_ID)).toBeNull();
    expect(await repo.list()).toHaveLength(0);
  });

  it('namespaces isolate data', async () => {
    const storage = fakeStorage();
    const a = createLocalStorageProjectRepository({ storage, namespace: 'a' });
    const b = createLocalStorageProjectRepository({ storage, namespace: 'b' });
    await a.save(serializeProjectSnapshot(makeSource(), PROJECT_ID));
    expect(await b.load(PROJECT_ID)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Store binding — capture + restore round-trip against real engine stores
// ---------------------------------------------------------------------------

describe('store binding — capture + restore', () => {
  function freshStores() {
    return {
      stores: {
        graph: createInMemoryGraphStore(),
        versions: createInMemoryVersionStore(),
        events: createInMemoryEventStore(),
      },
      profileStore: createInMemoryOperationalProfileStore(),
    };
  }

  it('captures a snapshot from live stores and restores an identical model', () => {
    const { stores, profileStore } = freshStores();
    stores.graph.setProject(makeProject());
    stores.graph.setComponent(makeComponent('cmp_a'));
    stores.graph.setComponent(makeComponent('cmp_b', 'heat_pump'));
    stores.graph.setConnection(makeConnection('cn_1', 'cmp_b', 'cmp_a'));
    profileStore.set(makeProfile());

    const snap = captureSnapshot(stores, profileStore, PROJECT_ID);
    const restored = restoreStoresFromSnapshot(snap);

    expect(restored.projectId).toBe(PROJECT_ID);
    expect(restored.stores.graph.getProject(PROJECT_ID)?.name).toBe('בניין מגורים');
    expect(restored.stores.graph.getComponents(PROJECT_ID)).toHaveLength(2);
    expect(restored.stores.graph.getConnections(PROJECT_ID)).toHaveLength(1);
    expect(restored.profileStore.listAll()).toHaveLength(1);
  });

  it('restored stores are independent of the originals', () => {
    const { stores, profileStore } = freshStores();
    stores.graph.setProject(makeProject());
    stores.graph.setComponent(makeComponent('cmp_a'));

    const snap = captureSnapshot(stores, profileStore, PROJECT_ID);
    const restored = restoreStoresFromSnapshot(snap);

    // Mutate the restored copy; the original must be untouched.
    restored.stores.graph.setComponent(makeComponent('cmp_new'));
    expect(restored.stores.graph.getComponents(PROJECT_ID)).toHaveLength(2);
    expect(stores.graph.getComponents(PROJECT_ID)).toHaveLength(1);
  });
})