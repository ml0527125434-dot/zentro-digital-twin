/**
 * Zentro Digital Twin — Persistence layer tests (Stage 35, P0-1)
 */

import { describe, it, expect } from 'vitest';
import type {
  Project, Component, Connection, OperationalProfile, AlarmRule,
} from '../domain/types.js';
import {
  serializeProjectSnapshot,
  parseProjectSnapshot,
  snapshotToJson,
  snapshotFromJson,
  SnapshotError,
  CURRENT_SCHEMA_VERSION,
  DOCUMENT_KIND,
  type ProjectSnapshot,
  type SnapshotSource,
} from './project-snapshot.js';
import { createInMemoryProjectRepository } from './in-memory-repository.js';
import {
  createLocalStorageProjectRepository,
  isLocalStorageAvailable,
  peekLatestSnapshotSync,
  type StorageLike,
} from './local-storage-repository.js';
import { captureSnapshot, restoreStoresFromSnapshot } from './store-binding.js';
import { createInMemoryGraphStore } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createInMemoryOperationalProfileStore } from '../projection/operational-profile-store.js';
import { createInMemoryAlarmStore } from '../alarm/alarm-store.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'proj_test';

function makeProject(): Project {
  return { id: PROJECT_ID, name: 'בניין מגורים', siteType: 'residential' };
}

function makeComponent(id: string, type = 'storage_tank'): Component {
  return {
    id, type, name: `רכיב ${id}`, projectId: PROJECT_ID,
    position: { x: 100, y: 120 }, bindings: [],
  };
}

function makeConnection(id: string, from: string, to: string): Connection {
  return {
    id, projectId: PROJECT_ID,
    fromComponentId: from, fromPortId: 'out_hot',
    toComponentId: to, toPortId: 'in_hot',
    medium: 'hot_water', topologicalDirection: 'forward',
  };
}

function makeProfile(): OperationalProfile {
  return { id: 'profile_1', appliesToType: 'storage_tank', scope: 'type_default', metrics: [] };
}

function makeAlarmRule(): AlarmRule {
  return {
    id: 'rule_1', componentId: 'cmp_a', triggerStatus: [],
    debounceSeconds: 5, severity: 'warning', message: 'alarm.test',
  };
}

function makeSource(): SnapshotSource {
  const project = makeProject();
  const components = [makeComponent('cmp_a'), makeComponent('cmp_b', 'heat_pump')];
  const connections = [makeConnection('cn_1', 'cmp_b', 'cmp_a')];
  const profiles = [makeProfile()];
  const rules = [makeAlarmRule()];
  return {
    getProject: (pid) => (pid === PROJECT_ID ? project : undefined),
    getComponents: () => components,
    getConnections: () => connections,
    listProfiles: () => profiles,
    listAlarmRules: () => rules,
  };
}

/** A valid raw document object (for parse tests), with overrides applied. */
function rawDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: DOCUMENT_KIND,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: '2026-06-29T00:00:00.000Z',
    project: makeProject(),
    operationalProfiles: [],
    components: [],
    connections: [],
    alarmRules: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

describe('project-snapshot — serialize', () => {
  it('captures project, components, connections, profiles, alarm rules + kind', () => {
    const snap = serializeProjectSnapshot(makeSource(), PROJECT_ID, () => '2026-06-29T00:00:00.000Z');
    expect(snap.kind).toBe(DOCUMENT_KIND);
    expect(snap.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(snap.savedAt).toBe('2026-06-29T00:00:00.000Z');
    expect(snap.project.id).toBe(PROJECT_ID);
    expect(snap.components).toHaveLength(2);
    expect(snap.connections).toHaveLength(1);
    expect(snap.operationalProfiles).toHaveLength(1);
    expect(snap.alarmRules).toHaveLength(1);
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

  it('writes the kind discriminator into the JSON', () => {
    const snap = serializeProjectSnapshot(makeSource(), PROJECT_ID);
    expect(JSON.parse(snapshotToJson(snap)).kind).toBe('zentro.digital-twin.document');
  });

  it('rejects non-JSON text', () => {
    expect(() => snapshotFromJson('{not json')).toThrow(SnapshotError);
  });

  it('rejects a document with a MISSING kind', () => {
    const noKind = rawDoc();
    delete noKind.kind;
    expect(() => parseProjectSnapshot(noKind)).toThrow(/Zentro document/);
  });

  it('rejects a document with the WRONG kind', () => {
    expect(() => parseProjectSnapshot(rawDoc({ kind: 'something.else' }))).toThrow(/Zentro document/);
  });

  it('rejects a missing schemaVersion', () => {
    const bad = rawDoc();
    delete bad.schemaVersion;
    expect(() => parseProjectSnapshot(bad)).toThrow(/schemaVersion/);
  });

  it('rejects a future schemaVersion', () => {
    expect(() => parseProjectSnapshot(rawDoc({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })))
      .toThrow(/newer/);
  });

  it('rejects a missing project', () => {
    const bad = rawDoc();
    delete bad.project;
    expect(() => parseProjectSnapshot(bad)).toThrow(/project/);
  });

  it('rejects components whose projectId mismatches', () => {
    expect(() => parseProjectSnapshot(rawDoc({
      components: [{ id: 'x', type: 't', projectId: 'other' }],
    }))).toThrow(/projectId/);
  });

  it('defaults alarmRules and profiles to [] when absent', () => {
    const doc = rawDoc();
    delete doc.alarmRules;
    delete doc.operationalProfiles;
    const parsed = parseProjectSnapshot(doc);
    expect(parsed.alarmRules).toEqual([]);
    expect(parsed.operationalProfiles).toEqual([]);
  });

  it('migrates a v1 document (no alarmRules) by adding an empty array', () => {
    const v1 = rawDoc({ schemaVersion: 1 });
    delete v1.alarmRules;
    const parsed = parseProjectSnapshot(v1);
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(parsed.alarmRules).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// In-memory repository
// ---------------------------------------------------------------------------

describe('in-memory repository', () => {
  it('saves and loads a snapshot', async () => {
    const repo = createInMemoryProjectRepository();
    await repo.save(serializeProjectSnapshot(makeSource(), PROJECT_ID));
    expect((await repo.load(PROJECT_ID))?.project.id).toBe(PROJECT_ID);
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

  it('peekLatestSnapshotSync reads the latest synchronously', async () => {
    const storage = fakeStorage();
    const repo = createLocalStorageProjectRepository({ storage, namespace: 'test' });
    await repo.save(serializeProjectSnapshot(makeSource(), PROJECT_ID));
    const peeked = peekLatestSnapshotSync({ storage, namespace: 'test' });
    expect(peeked?.project.id).toBe(PROJECT_ID);
    expect(peeked?.kind).toBe(DOCUMENT_KIND);
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
      alarmStore: createInMemoryAlarmStore(),
    };
  }

  it('captures from live stores and restores an identical model incl. alarm rules', () => {
    const { stores, profileStore, alarmStore } = freshStores();
    stores.graph.setProject(makeProject());
    stores.graph.setComponent(makeComponent('cmp_a'));
    stores.graph.setComponent(makeComponent('cmp_b', 'heat_pump'));
    stores.graph.setConnection(makeConnection('cn_1', 'cmp_b', 'cmp_a'));
    profileStore.set(makeProfile());
    alarmStore.setAlarmRule(makeAlarmRule());

    const snap = captureSnapshot(stores, profileStore, alarmStore, PROJECT_ID);
    expect(snap.alarmRules).toHaveLength(1);

    const restored = restoreStoresFromSnapshot(snap);
    expect(restored.projectId).toBe(PROJECT_ID);
    expect(restored.stores.graph.getProject(PROJECT_ID)?.name).toBe('בניין מגורים');
    expect(restored.stores.graph.getComponents(PROJECT_ID)).toHaveLength(2);
    expect(restored.stores.graph.getConnections(PROJECT_ID)).toHaveLength(1);
    expect(restored.profileStore.listAll()).toHaveLength(1);
    expect(restored.alarmStore.listAllRules()).toHaveLength(1);
  });

  it('restored stores are independent of the originals', () => {
    const { stores, profileStore, alarmStore } = freshStores();
    stores.graph.setProject(makeProject());
    stores.graph.setComponent(makeComponent('cmp_a'));

    const snap = captureSnapshot(stores, profileStore, alarmStore, PROJECT_ID);
    const restored = restoreStoresFromSnapshot(snap);

    restored.stores.graph.setComponent(makeComponent('cmp_new'));
    expect(restored.stores.graph.getComponents(PROJECT_ID)).toHaveLength(2);
    expect(stores.graph.getComponents(PROJECT_ID)).toHaveLength(1);
  });
});
