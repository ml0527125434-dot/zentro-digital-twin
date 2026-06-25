/**
 * Zentro Digital Twin — Demo App Entry Point (Stage 12)
 *
 * Zero-argument composition root for the hot-water demo.
 * Builds the component registry, constructs the hot-water payload,
 * bootstraps all runtime stores, and renders ZentroApp.
 *
 * This is development/demo code only.
 * No production wiring. No async. No network. No backend logic.
 */

import React from 'react';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP }   from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { buildHotWaterPayload } from '../ingestion/fixture-adapter.js';
import { bootstrapApp } from './bootstrap.js';
import { ZentroApp } from './ZentroApp.js';

function buildDemoRegistry() {
  const registry = createComponentRegistry();
  registerBaseLibrary(registry);
  registry.register(GAS_BACKUP);
  registry.register(POINT_OF_USE);
  return registry;
}

const registry = buildDemoRegistry();
const payload  = buildHotWaterPayload(registry);
const ctx      = bootstrapApp(payload, registry);

export function DemoApp() {
  return (
    <ZentroApp
      projectId={ctx.projectId}
      stores={ctx.stores}
      registry={ctx.registry}
      liveStore={ctx.liveStore}
      profileStore={ctx.profileStore}
      alarmStore={ctx.alarmStore}
      createdBy="demo"
    />
  );
}
