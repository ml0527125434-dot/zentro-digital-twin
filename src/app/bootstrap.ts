/**
 * Zentro Digital Twin — Application Bootstrap (Stage 11)
 *
 * Assembles all runtime stores and loads a ZentroPayload into them.
 * Returns a fully-populated AppContext ready to pass to ZentroApp.
 *
 * Caller is responsible for supplying a pre-configured ComponentRegistry
 * (registry composition is site/deployment configuration, not bootstrap logic).
 *
 * Synchronous. No async, no network, no config/env reading.
 */

import { createInMemoryGraphStore, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createInMemoryLiveStore, type LiveStore } from '../telemetry/live-store.js';
import { createInMemoryOperationalProfileStore, type OperationalProfileStore } from '../projection/operational-profile-store.js';
import { createInMemoryAlarmStore, type AlarmStore } from '../alarm/alarm-store.js';
import type { ComponentRegistry } from '../lib/component-registry.js';
import { createIngestor } from '../ingestion/ingestion-contract.js';
import { loadFixture, type ZentroPayload } from '../ingestion/fixture-adapter.js';

export interface AppContext {
  stores:       EngineStores;
  liveStore:    LiveStore;
  profileStore: OperationalProfileStore;
  alarmStore:   AlarmStore;
  registry:     ComponentRegistry;
  projectId:    string;
}

export function bootstrapApp(
  payload:  ZentroPayload,
  registry: ComponentRegistry,
): AppContext {
  const stores: EngineStores = {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
  const liveStore    = createInMemoryLiveStore();
  const profileStore = createInMemoryOperationalProfileStore();
  const alarmStore   = createInMemoryAlarmStore();

  loadFixture(payload, createIngestor(), stores, profileStore, alarmStore, liveStore);

  return {
    stores,
    liveStore,
    profileStore,
    alarmStore,
    registry,
    projectId: payload.graph.project.id,
  };
}
