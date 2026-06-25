/**
 * Zentro Digital Twin — Demo App Entry Point (Stage 12, updated Stage 14)
 *
 * Zero-argument composition root for the hot-water demo.
 * Builds the component registry, constructs the hot-water payload,
 * bootstraps all runtime stores, and renders ZentroApp.
 *
 * Stage 14: starts the telemetry simulation engine on mount.
 * The engine writes LiveSample values to liveStore outside React.
 * ZentroApp auto-refreshes its clock every 1 s to pick up new values.
 *
 * This is development/demo code only.
 * No production wiring. No network. No backend logic.
 */

import React, { useEffect } from 'react';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP }   from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { buildHotWaterPayload } from '../ingestion/fixture-adapter.js';
import { bootstrapApp } from './bootstrap.js';
import { ZentroApp } from './ZentroApp.js';
import { createHotWaterSimulation } from '../simulation/hot-water-simulation.js';
import { createEvaluationRunner } from '../simulation/evaluation-runner.js';

function buildDemoRegistry() {
  const registry = createComponentRegistry();
  registerBaseLibrary(registry);
  registry.register(GAS_BACKUP);
  registry.register(POINT_OF_USE);
  return registry;
}

// Module-level bootstrap — runs once per import, stores are stable references.
const registry = buildDemoRegistry();
const payload  = buildHotWaterPayload(registry);
const ctx      = bootstrapApp(payload, registry);

export function DemoApp() {
  useEffect(() => {
    const engine = createHotWaterSimulation(ctx.liveStore);
    engine.start();
    return () => engine.stop();
  }, []);

  useEffect(() => {
    const runner = createEvaluationRunner(
      ctx.projectId, ctx.stores, ctx.liveStore,
      ctx.registry, ctx.profileStore, ctx.alarmStore, 1_000,
    );
    runner.start();
    return () => runner.stop();
  }, []);

  return (
    <ZentroApp
      projectId={ctx.projectId}
      stores={ctx.stores}
      registry={ctx.registry}
      liveStore={ctx.liveStore}
      profileStore={ctx.profileStore}
      alarmStore={ctx.alarmStore}
      createdBy="demo"
      autoRefreshMs={1_000}
    />
  );
}
