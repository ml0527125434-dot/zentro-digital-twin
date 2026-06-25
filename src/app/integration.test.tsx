/** @vitest-environment happy-dom */
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';

import { createInMemoryGraphStore, createProject, type EngineStores } from '../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../domain/project-version.js';
import { createInMemoryEventStore } from '../domain/event-store.js';
import { createInMemoryLiveStore } from '../telemetry/live-store.js';
import { createInMemoryOperationalProfileStore } from '../projection/operational-profile-store.js';
import { createInMemoryAlarmStore } from '../alarm/alarm-store.js';
import { createComponentRegistry } from '../lib/component-registry.js';
import { registerBaseLibrary } from '../lib/component-library.js';
import { GAS_BACKUP   } from '../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../lib/definitions/point-of-use.def.js';
import { buildHotWaterSeed, HOT_WATER_PROJECT_ID } from '../seed/hot-water.seed.js';
import { ValueProvenance, HealthState, SensorState } from '../domain/types.js';

import { ZentroApp } from './ZentroApp.js';
import { FlowMapView } from './FlowMapView.js';
import { DashboardPanel } from './DashboardPanel.js';
import { useProjection } from './useProjection.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStores(): EngineStores {
  return {
    graph:    createInMemoryGraphStore(),
    versions: createInMemoryVersionStore(),
    events:   createInMemoryEventStore(),
  };
}

function makeFullRegistry() {
  const r = createComponentRegistry();
  registerBaseLibrary(r);
  r.register(GAS_BACKUP);
  r.register(POINT_OF_USE);
  return r;
}

const NOW    = 1_000_000_000_000;
const NOW_TS = new Date(NOW).toISOString();

// ---------------------------------------------------------------------------
// ZentroApp renders
// ---------------------------------------------------------------------------

describe('ZentroApp', () => {
  it('renders without throwing on hot-water seed', () => {
    const stores       = makeStores();
    const registry     = makeFullRegistry();
    const liveStore    = createInMemoryLiveStore();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);

    expect(() =>
      render(
        <ZentroApp
          projectId={HOT_WATER_PROJECT_ID}
          stores={stores}
          registry={registry}
          liveStore={liveStore}
          profileStore={profileStore}
          alarmStore={alarmStore}
        />,
      ),
    ).not.toThrow();
  });

  it('renders the dashboard-panel container', () => {
    const stores       = makeStores();
    const registry     = makeFullRegistry();
    const liveStore    = createInMemoryLiveStore();
    const profileStore = createInMemoryOperationalProfileStore();
    const alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);

    render(
      <ZentroApp
        projectId={HOT_WATER_PROJECT_ID}
        stores={stores}
        registry={registry}
        liveStore={liveStore}
        profileStore={profileStore}
        alarmStore={alarmStore}
      />,
    );

    expect(screen.getByTestId('dashboard-panel')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Shared model ג€” both views consume the same VMs
// ---------------------------------------------------------------------------

describe('Shared ViewModel invariant', () => {
  let stores:       EngineStores;
  let registry:     ReturnType<typeof makeFullRegistry>;
  let liveStore:    ReturnType<typeof createInMemoryLiveStore>;
  let profileStore: ReturnType<typeof createInMemoryOperationalProfileStore>;
  let alarmStore:   ReturnType<typeof createInMemoryAlarmStore>;

  beforeEach(() => {
    stores       = makeStores();
    registry     = makeFullRegistry();
    liveStore    = createInMemoryLiveStore();
    profileStore = createInMemoryOperationalProfileStore();
    alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
  });

  it('graph has 6 components and 6 connections after seed', () => {
    expect(stores.graph.getComponents(HOT_WATER_PROJECT_ID)).toHaveLength(6);
    expect(stores.graph.getConnections(HOT_WATER_PROJECT_ID)).toHaveLength(6);
  });

  it('DashboardPanel renders one item per component', () => {
    const componentVMs = Object.fromEntries(
      stores.graph.getComponents(HOT_WATER_PROJECT_ID).map(c => [c.id, {
        health:            HealthState.Healthy,
        operationalStatus: 'unknown',
        sensorState:       SensorState.Unknown,
        provenance:        ValueProvenance.Unknown,
        liveValues:        {},
        activeCommands:    [],
        activeAlarms:      [],
        componentId:       c.id,
      }]),
    );

    render(
      <DashboardPanel
        projectId={HOT_WATER_PROJECT_ID}
        stores={stores}
        componentVMs={componentVMs as never}
      />,
    );

    expect(screen.getAllByTestId(/^dashboard-item-/)).toHaveLength(6);
  });

  it('both FlowMapView and DashboardPanel receive the same VM reference', () => {
    liveStore.set('b_t1', {
      bindingId: 'b_t1', value: 62, ts: NOW_TS, state: SensorState.Live,
      provenance: ValueProvenance.Measured, confidence: 1,
    });

    let capturedVMs: Record<string, unknown> = {};

    function TestHarness() {
      const { componentVMs, connectionVMs } = useProjection(
        HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, NOW,
      );
      capturedVMs = componentVMs as Record<string, unknown>;
      return (
        <>
          <FlowMapView projectId={HOT_WATER_PROJECT_ID} stores={stores} componentVMs={componentVMs} connectionVMs={connectionVMs} />
          <DashboardPanel projectId={HOT_WATER_PROJECT_ID} stores={stores} componentVMs={componentVMs} />
        </>
      );
    }

    render(<TestHarness />);

    expect(capturedVMs['cmp_tank']).toBeDefined();
    const tankVm = capturedVMs['cmp_tank'] as { sensorState: SensorState };
    expect(tankVm.sensorState).toBe(SensorState.Live);
  });

  it('LiveStore update outside React propagates to both views on re-render', () => {
    let capturedSensorState: SensorState | undefined;

    function TestHarness({ ts }: { ts: number }) {
      const { componentVMs } = useProjection(
        HOT_WATER_PROJECT_ID, stores, liveStore, registry, profileStore, alarmStore, ts,
      );
      capturedSensorState = componentVMs['cmp_tank']?.sensorState;
      return <DashboardPanel projectId={HOT_WATER_PROJECT_ID} stores={stores} componentVMs={componentVMs} />;
    }

    const { rerender } = render(<TestHarness ts={NOW} />);
    expect(capturedSensorState).toBe(SensorState.Unknown);

    liveStore.set('b_t1', {
      bindingId: 'b_t1', value: 58, ts: NOW_TS, state: SensorState.Live,
      provenance: ValueProvenance.Measured, confidence: 1,
    });

    act(() => { rerender(<TestHarness ts={NOW} />); });
    expect(capturedSensorState).toBe(SensorState.Live);
  });
});

// ---------------------------------------------------------------------------
// Architecture invariants ג€” no projection in view components
// ---------------------------------------------------------------------------

describe('Architecture invariants', () => {
  it('FlowMapView does not import from src/projection', async () => {
    const mod = await import('./FlowMapView.js');
    expect(typeof mod.FlowMapView).toBe('function');
  });

  it('DashboardPanel does not import from src/projection', async () => {
    const mod = await import('./DashboardPanel.js');
    expect(typeof mod.DashboardPanel).toBe('function');
  });

  it('useProjection is the sole integration point for projection', async () => {
    const mod = await import('./useProjection.js');
    expect(typeof mod.useProjection).toBe('function');
  });
});


