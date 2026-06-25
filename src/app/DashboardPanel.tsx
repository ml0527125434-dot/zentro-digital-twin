/**
 * Zentro Digital Twin — DashboardPanel (Stage 6)
 *
 * Minimal read-only component list: name, health, operationalStatus.
 * Receives pre-computed ViewModels as props — never calls projection.
 * Never imports from src/projection.
 */

import React from 'react';
import type { ComponentViewModel } from '../domain/types.js';
import type { EngineStores } from '../engine/graph-engine.js';

export interface DashboardPanelProps {
  projectId:    string;
  stores:       EngineStores;
  componentVMs: Record<string, ComponentViewModel>;
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
        return (
          <li key={component.id} data-testid={`dashboard-item-${component.id}`}>
            <span data-testid="component-name">{component.name}</span>
            {vm && (
              <>
                <span data-testid="component-health">{vm.health}</span>
                <span data-testid="component-status">{vm.operationalStatus}</span>
                <span data-testid="component-sensor-state">{vm.sensorState}</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
