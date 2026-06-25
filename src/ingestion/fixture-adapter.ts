/**
 * Zentro Digital Twin — Fixture Adapter (Stage 10)
 *
 * Synchronous payload loader over the Stage 9 Ingestor.
 * One call site populates all four runtime stores from a single ZentroPayload.
 *
 * This is not a network adapter. No HTTP, WebSocket, fetch, scheduler, or
 * async API. When a real backend adapter arrives it will produce a ZentroPayload
 * and call loadFixture() with the same signature — zero changes inside the app.
 */

import type { LiveSample, AlarmRule } from '../domain/types.js';
import { NodeStatus } from '../domain/types.js';
import type { EngineStores } from '../engine/graph-engine.js';
import {
  createInMemoryGraphStore,
  createProject,
  addComponent,
  addConnection,
} from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import type { OperationalProfileStore } from '../projection/operational-profile-store.js';
import type { AlarmStore } from '../alarm/alarm-store.js';
import type { LiveStore } from '../telemetry/live-store.js';
import type { ComponentRegistry } from '../lib/component-registry.js';
import type { Ingestor, GraphSnapshot, ProfileSnapshot, AlarmRuleSnapshot } from './ingestion-contract.js';
import {
  buildHotWaterSeed,
  HOT_WATER_PROJECT_ID,
  HOT_WATER_PROFILES,
} from '../seed/hot-water.seed.js';

// ---------------------------------------------------------------------------
// HOT_WATER_ALARM_RULES — alarm rules for the hot-water demo
//
// Rules cover the two components that have OperationalProfiles with
// meaningful threshold bands. Debounce values are short for demo visibility.
// ---------------------------------------------------------------------------

export const HOT_WATER_ALARM_RULES: readonly AlarmRule[] = [
  {
    id:              'rule_tank_risk',
    componentId:     'cmp_tank',
    triggerStatus:   [NodeStatus.Risk],
    debounceSeconds: 5,
    severity:        'critical',
    message:         'alarm.rule.tank_risk',
  },
  {
    id:              'rule_tank_warn',
    componentId:     'cmp_tank',
    triggerStatus:   [NodeStatus.Warn],
    debounceSeconds: 10,
    severity:        'warning',
    message:         'alarm.rule.tank_warn',
  },
  {
    id:              'rule_shower_scald',
    componentId:     'cmp_shower',
    triggerStatus:   [NodeStatus.Scald],
    debounceSeconds: 0,
    severity:        'critical',
    message:         'alarm.rule.shower_scald',
  },
  {
    id:              'rule_shower_cold',
    componentId:     'cmp_shower',
    triggerStatus:   [NodeStatus.Cold],
    debounceSeconds: 10,
    severity:        'warning',
    message:         'alarm.rule.shower_cold',
  },
];

// ---------------------------------------------------------------------------
// ZentroPayload — the single composite type for a full frontend load
// ---------------------------------------------------------------------------

export interface ZentroPayload {
  graph:      GraphSnapshot;
  profiles:   ProfileSnapshot;
  alarmRules: AlarmRuleSnapshot;
  samples?:   LiveSample[];
}

// ---------------------------------------------------------------------------
// loadFixture — drives all four ingestor methods in dependency order
// ---------------------------------------------------------------------------

export function loadFixture(
  payload:      ZentroPayload,
  ingestor:     Ingestor,
  stores:       EngineStores,
  profileStore: OperationalProfileStore,
  alarmStore:   AlarmStore,
  liveStore:    LiveStore,
): void {
  // 1. Graph first — components must exist before alarm rules can reference them
  ingestor.ingestGraph(payload.graph, stores);
  // 2. Profiles
  ingestor.ingestProfiles(payload.profiles, profileStore);
  // 3. Alarm rules
  ingestor.ingestAlarmRules(payload.alarmRules, alarmStore);
  // 4. Samples — optional; absent means no live data yet
  for (const sample of payload.samples ?? []) {
    ingestor.ingestSample(sample, liveStore);
  }
}

// ---------------------------------------------------------------------------
// buildHotWaterPayload — hot-water seed expressed as a ZentroPayload
//
// Calls buildHotWaterSeed() on a temporary EngineStores to materialise its
// component/connection output, then wraps it in the ZentroPayload shape.
// The seed file is not modified; its mutation-based architecture is preserved.
// ---------------------------------------------------------------------------

export function buildHotWaterPayload(registry: ComponentRegistry): ZentroPayload {
  const tempStores: EngineStores = {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };

  buildHotWaterSeed(tempStores, registry);

  const pid = HOT_WATER_PROJECT_ID;

  return {
    graph: {
      project:     tempStores.graph.getProject(pid)!,
      components:  tempStores.graph.getComponents(pid),
      connections: tempStores.graph.getConnections(pid),
    },
    profiles:   { profiles: HOT_WATER_PROFILES },
    alarmRules: { rules: [...HOT_WATER_ALARM_RULES] },
    samples:    [],
  };
}
