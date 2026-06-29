/**
 * Zentro Digital Twin — Demo App Entry Point (Stage 12, updated Stage 14, Stage 35)
 *
 * Zero-argument composition root for the hot-water demo.
 * Builds the component registry, constructs the hot-water payload,
 * bootstraps all runtime stores, and renders ZentroApp.
 *
 * Stage 14: starts the telemetry simulation engine on mount.
 * Stage 35: wires persistence. On startup it hydrates the CONFIG graph from the
 *   storage port (localStorage by default) when a saved project exists, otherwise
 *   it loads the demo fixture and saves an initial snapshot. Every mutation then
 *   autosaves via ZentroApp. The composition root is the only place that picks a
 *   concrete storage adapter — the Builder stays storage-agnostic.
 *
 * This is development/demo code only. No production wiring. No network.
 */

import React, { useEffect } from 'react';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { registerHotWaterLibrary } from '../lib/hot-water-library.js';
import { bootstrapApp, type AppContext } from './bootstrap.js';
import { DemoRuntimeSource } from '../runtime/demo-runtime-source.js';
import { ZentroApp } from './ZentroApp.js';
import { createHotWaterSimulation } from '../simulation/hot-water-simulation.js';
import { createEvaluationRunner } from '../simulation/evaluation-runner.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import {
  peekLatestSnapshotSync,
  restoreStoresFromSnapshot,
  captureSnapshot,
  createLocalStorageProjectRepository,
  createInMemoryProjectRepository,
  isLocalStorageAvailable,
  type ProjectRepository,
} from '../persistence/index.js';

const PERSISTENCE_NAMESPACE = 'zentro';

function buildDemoRegistry() {
  const registry = createComponentRegistry();
  registerBaseLibrary(registry);
  registerHotWaterLibrary(registry);
  return registry;
}

/** Pick a persistence adapter: localStorage when available, else in-memory. */
function buildRepo(): ProjectRepository {
  return isLocalStorageAvailable()
    ? createLocalStorageProjectRepository({ namespace: PERSISTENCE_NAMESPACE })
    : createInMemoryProjectRepository();
}

function buildCtx(repo: ProjectRepository): AppContext {
  const registry = buildDemoRegistry();

  // 1) Try to restore a previously saved building model (incl. alarm rules).
  const saved = peekLatestSnapshotSync({ namespace: PERSISTENCE_NAMESPACE });
  if (saved) {
    const restored = restoreStoresFromSnapshot(saved);
    return {
      stores: restored.stores,
      liveStore: createInMemoryLiveStore(),
      profileStore: restored.profileStore,
      alarmStore: restored.alarmStore,
      registry,
      projectId: restored.projectId,
    };
  }

  // 2) First run — load the demo fixture and persist an initial snapshot so a
  //    plain reload restores the same model (including its alarm rules).
  const payload = new DemoRuntimeSource().getInitialPayload(registry);
  const ctx = bootstrapApp(payload, registry);
  void Promise.resolve(
    repo.save(captureSnapshot(ctx.stores, ctx.profileStore, ctx.alarmStore, ctx.projectId)),
  ).catch(() => { /* best-effort initial save */ });
  return ctx;
}

// Lazy singleton — safe for Vite HMR: initialization defers until first render,
// so all imports are guaranteed to be resolved by the time we run.
let _repo: ProjectRepository | null = null;
let _ctx: AppContext | null = null;
function getRepo() {
  if (!_repo) _repo = buildRepo();
  return _repo;
}
function getCtx() {
  if (!_ctx) _ctx = buildCtx(getRepo());
  return _ctx;
}

export function DemoApp() {
  const repo = getRepo();
  const ctx = getCtx();

  useEffect(() => {
    const engine = createHotWaterSimulation(ctx.liveStore);
    engine.start();
    return () => engine.stop();
  }, [ctx.liveStore]);

  useEffect(() => {
    const runner = createEvaluationRunner(
      ctx.projectId, ctx.stores, ctx.liveStore,
      ctx.registry, ctx.profileStore, ctx.alarmStore, 1_000,
    );
    runner.start();
    return () => runner.stop();
  }, [ctx.projectId, ctx.stores, ctx.liveStore, ctx.registry, ctx.profileStore, ctx.alarmStore]);

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
      repo={repo}
    />
  );
}
