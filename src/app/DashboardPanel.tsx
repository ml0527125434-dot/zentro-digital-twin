/**
 * Zentro Digital Twin — DashboardPanel (Stage 6, updated Stage 18)
 *
 * Minimal read-only component list: name, health, operationalStatus.
 * Receives pre-computed ViewModels as props — never calls projection.
 * Never imports from src/projection.
 */

import React from 'react';
import type { ComponentViewModel } from '../domain/types.js';
import type { EngineStores } from '../engine/graph-engine.js';
import {
  healthPresentation,
  nodeStatusPresentation,
  sensorStatePresentation,
} from '../renderer/theme.js';

export interface DashboardPanelProps {
  projectId:    string;
  stores:       EngineStores;
  componentVMs: Record<string, ComponentViewModel>;
}

function Chip({ cssVar, icon, label }: { cssVar: string; icon: string; label: string }) {
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          3,
      fontSize:     10,
      color:        `var(${cssVar})`,
      background:   `color-mix(in srgb, var(${cssVar}) 12%, transparent)`,
      borderRadius: 4,
      padding:      '1px 5px',
    }}>
      {icon} {label}
    </span>
  );
}

export function DashboardPanel({
  projectId,
  stores,
  componentVMs,
}: DashboardPanelProps) {
  const components = stores.graph.getComponents(projectId);

  return (
    <ul data-testid="dashboard-panel">
      {components.map(component => {
        const vm = componentVMs[component.id];
        if (!vm) return (
          <li key={component.id} data-testid={`dashboard-item-${component.id}`}>
            <span data-testid="component-name">{component.name}</span>
          </li>
        );

        const healthPres = healthPresentation(vm.health);
        const statusPres = nodeStatusPresentation(vm.operationalStatus);
        const sensorPres = sensorStatePresentation(vm.sensorState);
        const activeAlarmCount = vm.activeAlarms.filter(a => a.state === 'active').length;

        return (
          <li key={component.id} data-testid={`dashboard-item-${component.id}`}>
            <span data-testid="component-name">{component.name}</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
              <Chip
                cssVar={healthPres.cssVar}
                icon={healthPres.icon}
                label={healthPres.label}
              />
              <span data-testid="component-health" style={{ display: 'none' }}>{vm.health}</span>
              <Chip
                cssVar={statusPres.cssVar}
                icon={statusPres.icon}
                label={statusPres.label}
              />
              <span data-testid="component-status" style={{ display: 'none' }}>{vm.operationalStatus}</span>
              <Chip
                cssVar={sensorPres.cssVar}
                icon={sensorPres.icon}
                label={sensorPres.label}
              />
              <span data-testid="component-sensor-state" style={{ display: 'none' }}>{vm.sensorState}</span>
              {activeAlarmCount > 0 && (
                <span style={{
                  fontSize: 10, color: 'var(--status-critical)',
                  background: 'color-mix(in srgb, var(--status-critical) 12%, transparent)',
                  borderRadius: 4, padding: '1px 5px',
                }}>
                  ⚠ {activeAlarmCount} alarm{activeAlarmCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
