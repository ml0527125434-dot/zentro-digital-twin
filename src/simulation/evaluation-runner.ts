/**
 * Zentro Digital Twin — Alarm Evaluation Runner (Stage 15)
 *
 * External service that periodically projects each component's NodeStatus
 * and applies alarm evaluation. Runs outside React — no hooks, no renders.
 *
 * Architecture: the runner reads from all stores, projects status, and
 * writes alarm results via applyAlarmEvaluation. React never calls this.
 * A useEffect in DemoApp manages its lifecycle (start/stop only).
 */

import type { EngineStores } from '../engine/graph-engine.js';
import type { ComponentRegistry } from '../lib/component-registry.js';
import type { LiveStore } from '../telemetry/live-store.js';
import type { OperationalProfileStore } from '../projection/operational-profile-store.js';
import type { AlarmStore } from '../alarm/alarm-store.js';
import { projectComponent } from '../projection/project-component.js';
import { applyAlarmEvaluation } from '../alarm/alarm-evaluator.js';

export interface EvaluationRunner {
  start():     void;
  stop():      void;
  isRunning(): boolean;
}

export function createEvaluationRunner(
  projectId:    string,
  stores:       EngineStores,
  liveStore:    LiveStore,
  registry:     ComponentRegistry,
  profileStore: OperationalProfileStore,
  alarmStore:   AlarmStore,
  intervalMs:   number,
): EvaluationRunner {
  let handle: ReturnType<typeof setInterval> | null = null;

  function tick(): void {
    const nowMs      = Date.now();
    const components = stores.graph.getComponents(projectId);

    for (const component of components) {
      const definition = registry.get(component.type);
      if (!definition) continue;

      // Only evaluate components that have alarm rules — avoids redundant projections.
      if (alarmStore.getAlarmRulesForComponent(component.id).length === 0) continue;

      const profile = component.operationalProfileId
        ? profileStore.get(component.operationalProfileId)
        : undefined;

      const vm = projectComponent(component, definition, liveStore, [], [], profile, nowMs);

      applyAlarmEvaluation(component.id, vm.operationalStatus, nowMs, alarmStore);
    }
  }

  return {
    start() {
      if (handle !== null) return;
      tick();
      handle = setInterval(tick, intervalMs);
    },
    stop() {
      if (handle === null) return;
      clearInterval(handle);
      handle = null;
    },
    isRunning() {
      return handle !== null;
    },
  };
}
