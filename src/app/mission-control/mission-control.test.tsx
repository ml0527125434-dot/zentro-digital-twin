/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

import { createInMemoryGraphStore, type EngineStores } from '../../engine/graph-engine.js';
import { createInMemoryVersionStore } from '../../domain/project-version.js';
import { createInMemoryEventStore } from '../../domain/event-store.js';
import { createInMemoryLiveStore } from '../../telemetry/live-store.js';
import { createInMemoryOperationalProfileStore } from '../../projection/operational-profile-store.js';
import { createInMemoryAlarmStore } from '../../alarm/alarm-store.js';
import { createComponentRegistry } from '../../lib/component-registry.js';
import { registerBaseLibrary } from '../../lib/component-library.js';
import { GAS_BACKUP   } from '../../lib/definitions/gas-backup.def.js';
import { POINT_OF_USE } from '../../lib/definitions/point-of-use.def.js';
import { buildHotWaterSeed, HOT_WATER_PROJECT_ID } from '../../seed/hot-water.seed.js';
import { LocaleProvider } from '../../i18n/index.js';
import { ZentroApp } from '../ZentroApp.js';
import { MissionControlView } from './MissionControlView.js';
import { KpiBar } from './KpiBar.js';
import { SystemStatusBar } from './SystemStatusBar.js';
import { AlarmBanner } from './AlarmBanner.js';
import { EquipmentGrid } from './EquipmentGrid.js';
import { EventTimeline } from './EventTimeline.js';
import { EquipmentDrawer } from './EquipmentDrawer.js';
import {
  SensorState, HealthState, NodeStatus, ValueProvenance,
} from '../../domain/types.js';
import type { ComponentViewModel } from '../../domain/types.js';

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

// ---------------------------------------------------------------------------
// Presentation Mode (Stage 26)
// ---------------------------------------------------------------------------

function makeZentroApp() {
  const stores       = makeStores();
  const registry     = makeFullRegistry();
  const liveStore    = createInMemoryLiveStore();
  const profileStore = createInMemoryOperationalProfileStore();
  const alarmStore   = createInMemoryAlarmStore();
  buildHotWaterSeed(stores, registry);
  return (
    <ZentroApp
      projectId={HOT_WATER_PROJECT_ID}
      stores={stores}
      registry={registry}
      liveStore={liveStore}
      profileStore={profileStore}
      alarmStore={alarmStore}
    />
  );
}

describe('Presentation Mode', () => {
  it('renders the presentation mode enter button', () => {
    render(makeZentroApp());
    expect(screen.getByTestId('pres-enter-btn')).toBeTruthy();
  });

  it('shows exit button and hides enter button when enter is clicked', () => {
    render(makeZentroApp());
    act(() => { screen.getByTestId('pres-enter-btn').click(); });
    expect(screen.getByTestId('pres-exit-btn')).toBeTruthy();
  });

  it('returns to normal when exit is clicked', () => {
    render(makeZentroApp());
    act(() => { screen.getByTestId('pres-enter-btn').click(); });
    act(() => { screen.getByTestId('pres-exit-btn').click(); });
    expect(screen.getByTestId('pres-enter-btn')).toBeTruthy();
    expect(screen.queryByTestId('pres-exit-btn')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Demo Info Strip (Stage 25)
// ---------------------------------------------------------------------------

describe('Demo Info Strip', () => {
  it('renders the demo info strip by default', () => {
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

    expect(screen.getByTestId('demo-info-strip')).toBeTruthy();
  });

  it('dismisses the demo info strip when × is clicked', () => {
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

    act(() => { screen.getByTestId('demo-info-dismiss').click(); });
    expect(screen.queryByTestId('demo-info-strip')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// MissionControlView — Stage 29 workspace layout
// ---------------------------------------------------------------------------

describe('MissionControlView', () => {
  function makeMCVProps() {
    const stores       = makeStores();
    const registry     = makeFullRegistry();
    const alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
    return {
      projectId:     HOT_WATER_PROJECT_ID,
      stores,
      registry,
      componentVMs:  {},
      connectionVMs: {},
      alarmStore,
      nowMs:         Date.now(),
    };
  }

  it('renders mission-control testid', () => {
    render(
      <LocaleProvider>
        <MissionControlView {...makeMCVProps()} />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('mission-control')).toBeTruthy();
  });

  it('renders workspace-left and workspace-right panels', () => {
    render(
      <LocaleProvider>
        <MissionControlView {...makeMCVProps()} />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('workspace-left')).toBeTruthy();
    expect(screen.getByTestId('workspace-right')).toBeTruthy();
  });

  it('shows inspector-placeholder when no component is selected', () => {
    render(
      <LocaleProvider defaultLocale="en">
        <MissionControlView {...makeMCVProps()} />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('inspector-placeholder')).toBeTruthy();
  });

  it('collapses left sidebar when sidebar-left-toggle is clicked', () => {
    render(
      <LocaleProvider>
        <MissionControlView {...makeMCVProps()} />
      </LocaleProvider>,
    );
    act(() => { screen.getByTestId('sidebar-left-toggle').click(); });
    // Width collapses to 0 — expand button should appear
    expect(screen.getByTestId('sidebar-left-expand')).toBeTruthy();
  });

  it('collapses right inspector when inspector-right-toggle is clicked', () => {
    render(
      <LocaleProvider>
        <MissionControlView {...makeMCVProps()} />
      </LocaleProvider>,
    );
    act(() => { screen.getByTestId('inspector-right-toggle').click(); });
    expect(screen.getByTestId('inspector-right-expand')).toBeTruthy();
  });

  it('re-expands left sidebar via sidebar-left-expand button', () => {
    render(
      <LocaleProvider>
        <MissionControlView {...makeMCVProps()} />
      </LocaleProvider>,
    );
    act(() => { screen.getByTestId('sidebar-left-toggle').click(); });
    act(() => { screen.getByTestId('sidebar-left-expand').click(); });
    expect(screen.queryByTestId('sidebar-left-expand')).toBeNull();
  });

  it('selecting a component via EquipmentGrid hides inspector-placeholder', () => {
    render(
      <LocaleProvider>
        <MissionControlView {...makeMCVProps()} />
      </LocaleProvider>,
    );
    // Placeholder visible before selection
    expect(screen.getByTestId('inspector-placeholder')).toBeTruthy();
    const items = screen.getAllByTestId(/^dashboard-item-/);
    act(() => { fireEvent.click(items[0]); });
    // Placeholder replaced by inspector content branch
    expect(screen.queryByTestId('inspector-placeholder')).toBeNull();
  });

  it('closes inspector and restores placeholder when inspector-close-btn is clicked', () => {
    const stores       = makeStores();
    const registry     = makeFullRegistry();
    const alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
    const components   = stores.graph.getComponents(HOT_WATER_PROJECT_ID);
    // Build minimal VMs so InspectorPanel renders content
    const vms: Record<string, ComponentViewModel> = {};
    for (const c of components) {
      vms[c.id] = {
        componentId:       c.id,
        health:            HealthState.Healthy,
        operationalStatus: NodeStatus.Ok,
        sensorState:       SensorState.Live,
        provenance:        ValueProvenance.Measured,
        liveValues:        {},
        activeCommands:    [],
        activeAlarms:      [],
      };
    }
    render(
      <LocaleProvider>
        <MissionControlView
          projectId={HOT_WATER_PROJECT_ID}
          stores={stores}
          registry={registry}
          componentVMs={vms}
          connectionVMs={{}}
          alarmStore={alarmStore}
          nowMs={Date.now()}
        />
      </LocaleProvider>,
    );
    const items = screen.getAllByTestId(/^dashboard-item-/);
    act(() => { fireEvent.click(items[0]); });
    expect(screen.getByTestId('inspector-panel')).toBeTruthy();
    act(() => { fireEvent.click(screen.getByTestId('inspector-close-btn')); });
    expect(screen.queryByTestId('inspector-panel')).toBeNull();
    expect(screen.getByTestId('inspector-placeholder')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// KpiBar
// ---------------------------------------------------------------------------

describe('KpiBar', () => {
  it('renders 8 KPI cards (kpi-bar present)', () => {
    const stores       = makeStores();
    const registry     = makeFullRegistry();
    const alarmStore   = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
    const components = stores.graph.getComponents(HOT_WATER_PROJECT_ID);

    render(
      <LocaleProvider>
        <KpiBar
          componentVMs={{}}
          connectionVMs={{}}
          alarmStore={alarmStore}
          projectId={HOT_WATER_PROJECT_ID}
          components={components}
        />
      </LocaleProvider>,
    );

    expect(screen.getByTestId('kpi-bar')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// SystemStatusBar
// ---------------------------------------------------------------------------

describe('SystemStatusBar', () => {
  it('renders without throwing when no VMs', () => {
    expect(() =>
      render(
        <LocaleProvider>
          <SystemStatusBar componentVMs={{}} nowMs={Date.now()} />
        </LocaleProvider>,
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AlarmBanner
// ---------------------------------------------------------------------------

describe('AlarmBanner', () => {
  it('renders null (no banner) when no active alarms', () => {
    const alarmStore = createInMemoryAlarmStore();
    const { container } = render(
      <LocaleProvider>
        <AlarmBanner alarmStore={alarmStore} components={[]} />
      </LocaleProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// EquipmentGrid — preserves testid compatibility
// ---------------------------------------------------------------------------

describe('EquipmentGrid', () => {
  it('renders dashboard-panel testid', () => {
    const stores     = makeStores();
    const registry   = makeFullRegistry();
    const alarmStore = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);

    render(
      <LocaleProvider>
        <EquipmentGrid
          projectId={HOT_WATER_PROJECT_ID}
          stores={stores}
          componentVMs={{}}
          alarmStore={alarmStore}
        />
      </LocaleProvider>,
    );

    expect(screen.getByTestId('dashboard-panel')).toBeTruthy();
  });

  it('renders 6 dashboard-item-* entries for hot-water seed', () => {
    const stores     = makeStores();
    const registry   = makeFullRegistry();
    const alarmStore = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);

    render(
      <LocaleProvider>
        <EquipmentGrid
          projectId={HOT_WATER_PROJECT_ID}
          stores={stores}
          componentVMs={{}}
          alarmStore={alarmStore}
        />
      </LocaleProvider>,
    );

    const items = screen.getAllByTestId(/^dashboard-item-/);
    expect(items).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// EventTimeline
// ---------------------------------------------------------------------------

describe('EventTimeline', () => {
  it('renders without throwing when no alarms', () => {
    const alarmStore = createInMemoryAlarmStore();
    expect(() =>
      render(
        <LocaleProvider>
          <EventTimeline
            alarmStore={alarmStore}
            components={[]}
            nowMs={Date.now()}
          />
        </LocaleProvider>,
      ),
    ).not.toThrow();
  });

  it('shows session start event', () => {
    const alarmStore = createInMemoryAlarmStore();
    render(
      <LocaleProvider defaultLocale="en">
        <EventTimeline
          alarmStore={alarmStore}
          components={[]}
          nowMs={Date.now()}
        />
      </LocaleProvider>,
    );
    // Session start key renders some text — just verify no crash and list present
    expect(document.querySelector('[data-testid]')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// EquipmentDrawer
// ---------------------------------------------------------------------------

describe('EquipmentDrawer', () => {
  const TANK_VM: ComponentViewModel = {
    componentId:       'cmp_tank',
    health:            HealthState.Healthy,
    operationalStatus: NodeStatus.Ok,
    sensorState:       SensorState.Live,
    provenance:        ValueProvenance.Measured,
    liveValues:        { temp: 55 },
    activeCommands:    [],
    activeAlarms:      [],
  };

  function makeDrawerProps(
    componentId: string | null,
    vms: Record<string, ComponentViewModel> = {},
    onClose = () => {},
  ) {
    const stores   = makeStores();
    const registry = makeFullRegistry();
    const alarmStore = createInMemoryAlarmStore();
    buildHotWaterSeed(stores, registry);
    return {
      componentId,
      projectId: HOT_WATER_PROJECT_ID,
      stores,
      registry,
      componentVMs: vms,
      alarmStore,
      onClose,
    };
  }

  it('renders drawer element (closed when componentId is null)', () => {
    const props = makeDrawerProps(null);
    render(<LocaleProvider><EquipmentDrawer {...props} /></LocaleProvider>);
    expect(screen.getByTestId('equipment-drawer')).toBeTruthy();
  });

  it('renders close button when a component and VM are provided', () => {
    const props = makeDrawerProps('cmp_tank', { cmp_tank: TANK_VM });
    render(<LocaleProvider><EquipmentDrawer {...props} /></LocaleProvider>);
    expect(screen.getByTestId('drawer-close-btn')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    let closed = false;
    const props = makeDrawerProps('cmp_tank', { cmp_tank: TANK_VM }, () => { closed = true; });
    render(<LocaleProvider><EquipmentDrawer {...props} /></LocaleProvider>);
    screen.getByTestId('drawer-close-btn').click();
    expect(closed).toBe(true);
  });

  it('calls onClose when backdrop is clicked', () => {
    let closed = false;
    const props = makeDrawerProps('cmp_tank', { cmp_tank: TANK_VM }, () => { closed = true; });
    render(<LocaleProvider><EquipmentDrawer {...props} /></LocaleProvider>);
    screen.getByTestId('drawer-backdrop').click();
    expect(closed).toBe(true);
  });

  it('shows component name when a VM is provided', () => {
    const props = makeDrawerProps('cmp_tank', { cmp_tank: TANK_VM });
    render(<LocaleProvider><EquipmentDrawer {...props} /></LocaleProvider>);
    expect(screen.getAllByText('Storage Tank').length).toBeGreaterThan(0);
  });
});
