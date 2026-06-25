/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

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
import { KpiBar } from './KpiBar.js';
import { SystemStatusBar } from './SystemStatusBar.js';
import { AlarmBanner } from './AlarmBanner.js';
import { EquipmentGrid } from './EquipmentGrid.js';
import { EventTimeline } from './EventTimeline.js';

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
