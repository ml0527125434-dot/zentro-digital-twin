/**
 * Zentro Digital Twin — useProjection (Stage 7)
 *
 * Single source of ViewModels for the entire application.
 * Calls projectComponent and projectConnection for every entity in the graph.
 * Neither FlowMapView nor DashboardPanel may call projection functions directly.
 *
 * LiveStore, OperationalProfileStore, and AlarmStore are consumed read-only.
 * React never writes to any of these stores.
 */

import type { ComponentViewModel, ConnectionViewModel } from '../domain/types.js';
import type { EngineStores } from '../engine/graph-engine.js';
import type { ComponentRegistry } from '../lib/component-registry.js';
import type { LiveStore } from '../telemetry/live-store.js';
import type { OperationalProfileStore } from '../projection/operational-profile-store.js';
import type { AlarmStore } from '../alarm/alarm-store.js';
import { getAlarmsWithSeverity } from '../alarm/alarm-store.js';
import { projectComponent } from '../projection/project-component.js';
import { projectConnection } from '../projection/project-connection.js';

export interface ProjectionSnapshot {
  /** Keyed by component id — Record for direct O(1) lookup in flow-transformers */
  componentVMs:  Record<string, ComponentViewModel>;
  /** Keyed by connection id */
  connectionVMs: Record<string, ConnectionViewModel>;
}

/**
 * Derives all ViewModels from the current graph + live data + profiles + alarms.
 * Re-computes on every render — caller controls cadence via nowMs.
 * No TELEMETRY writes. No CONFIG mutations. No COMMAND execution.
 */
export function useProjection(
  projectId:    string,
  stores:       EngineStores,
  liveStore:    LiveStore,
  registry:     ComponentRegistry,
  profileStore: OperationalProfileStore,
  alarmStore:   AlarmStore,
  nowMs:        number,
): ProjectionSnapshot {
  const components  = stores.graph.getComponents(projectId);
  const connections = stores.graph.getConnections(projectId);

  const componentVMs: Record<string, ComponentViewModel> = {};
  for (const component of components) {
    const definition = registry.get(component.type);
    if (!definition) continue;

    const profile = component.operationalProfileId
      ? profileStore.get(component.operationalProfileId)
      : undefined;

    const activeAlarms = getAlarmsWithSeverity(alarmStore, component.id);

    componentVMs[component.id] = projectComponent(
      component,
      definition,
      liveStore,
      activeAlarms,
      [],  // no CommandStore in Stage 7
      profile,
      nowMs,
    );
  }

  const connectionVMs: Record<string, ConnectionViewModel> = {};
  for (const connection of connections) {
    connectionVMs[connection.id] = projectConnection(connection, liveStore, nowMs);
  }

  return { componentVMs, connectionVMs };
}
