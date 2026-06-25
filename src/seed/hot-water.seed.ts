/**
 * Zentro Digital Twin — Hot Water Conformance Seed
 *
 * This is NOT a product feature. It is the acceptance test that the
 * Component SDK + Graph Engine can express a real hot-water system
 * with ZERO project-specific core code (Constitution Art. 14).
 *
 * The graph is assembled purely from:
 *   - ComponentDefinitions registered in the Component Library
 *   - Graph Engine mutations (createProject, addComponent, addConnection)
 *   - OperationalProfiles as seed data (not evaluated in Stage 2)
 *
 * No rendering, no live data, no commands, no alarms, no telemetry.
 *
 * Operator note: register all six definitions before calling buildHotWaterSeed().
 * Base library (registerBaseLibrary) covers 4; caller must also register
 * gas_backup and point_of_use explicitly for this conformance seed.
 */

import type { EngineStores } from '../engine/graph-engine.js';
import type { ComponentRegistry } from '../lib/component-registry.js';
import {
  createProject,
  addComponent,
  addConnection,
} from '../engine/graph-engine.js';
import type { OperationalProfile } from '../domain/types.js';
import { NodeStatus } from '../domain/types.js';

export const HOT_WATER_PROJECT_ID = 'proj_hw_conformance';
const CREATED_BY = 'conformance_seed';

// OperationalProfiles — seed data only, not evaluated in Stage 2.
export const HOT_WATER_PROFILES: OperationalProfile[] = [
  {
    id: 'op_tank_default', appliesToType: 'storage_tank', scope: 'type_default',
    metrics: [{ metric: 'temperature', unit: '°C', hysteresis: 1.5, bands: [
      { status: NodeStatus.Risk, max: 50 },
      { status: NodeStatus.Warn, min: 50, max: 55 },
      { status: NodeStatus.Ok,  min: 55 },
    ] }],
  },
  {
    id: 'op_supply_default', appliesToType: 'supply_line', scope: 'type_default',
    metrics: [{ metric: 'temperature', unit: '°C', hysteresis: 1.5, bands: [
      { status: NodeStatus.Risk, max: 50 },
      { status: NodeStatus.Warn, min: 50, max: 55 },
      { status: NodeStatus.Ok,  min: 55 },
    ] }],
  },
  {
    id: 'op_return_default', appliesToType: 'return_loop', scope: 'type_default',
    metrics: [{ metric: 'temperature', unit: '°C', hysteresis: 1.5, bands: [
      { status: NodeStatus.Risk, max: 45 },
      { status: NodeStatus.Warn, min: 45, max: 50 },
      { status: NodeStatus.Ok,  min: 50 },
    ] }],
  },
  {
    id: 'op_point_of_use_default', appliesToType: 'point_of_use', scope: 'type_default',
    metrics: [{ metric: 'temperature', unit: '°C', hysteresis: 1, bands: [
      { status: NodeStatus.Scald, min: 50 },
      { status: NodeStatus.Warn,  min: 45, max: 50 },
      { status: NodeStatus.Ok,    min: 38, max: 45 },
      { status: NodeStatus.Warn,  min: 30, max: 38 },
      { status: NodeStatus.Cold,  max: 30 },
    ] }],
  },
];

export interface HotWaterSeedResult {
  componentIds: string[];
  connectionIds: string[];
  totalMutations: number;
}

export function buildHotWaterSeed(
  stores:   EngineStores,
  registry: ComponentRegistry,
): HotWaterSeedResult {
  const pid = HOT_WATER_PROJECT_ID;

  // -------------------------------------------------------------------------
  // Project
  // -------------------------------------------------------------------------
  createProject(
    { id: pid, name: 'Hot Water System — Conformance Test', siteType: 'hot_water' },
    CREATED_BY,
    stores,
  );

  // -------------------------------------------------------------------------
  // Components (6)
  // -------------------------------------------------------------------------
  const tankDef     = registry.getOrThrow('storage_tank');
  const heatPumpDef = registry.getOrThrow('heat_pump');
  const gasDef      = registry.getOrThrow('gas_backup');
  const recircDef   = registry.getOrThrow('recirc_pump');
  const tmvDef      = registry.getOrThrow('mixing_valve');
  const pouDef      = registry.getOrThrow('point_of_use');

  addComponent(pid, {
    id: 'cmp_tank', type: tankDef.typeId, name: 'Storage Tank',
    position: { x: 80, y: 200 },
    operationalProfileId: 'op_tank_default',
    bindings: [
      { id: 'b_t1', source: 'mqtt', address: 'site/hw/tank/temp', metric: 'temperature', unit: '°C', ttlSeconds: 120 },
    ],
    allowedActions: [{ id: 'set_setpoint', label: 'Change Target Temp', dangerous: true }],
  }, CREATED_BY, stores);

  addComponent(pid, {
    id: 'cmp_heatpump', type: heatPumpDef.typeId, name: 'Heat Pump',
    position: { x: 80, y: 360 },
    bindings: [
      { id: 'b_hp_state', source: 'modbus', address: '40001', metric: 'runtime', ttlSeconds: 60 },
    ],
    allowedActions: [{ id: 'enable', label: 'Enable / Disable', dangerous: false }],
  }, CREATED_BY, stores);

  addComponent(pid, {
    id: 'cmp_gas_backup', type: gasDef.typeId, name: 'Gas Backup Boiler',
    position: { x: 80, y: 460 },
    bindings: [
      { id: 'b_gas_state', source: 'dry_contact', address: 'di/gas/run', metric: 'runtime', ttlSeconds: 60 },
    ],
  }, CREATED_BY, stores);

  addComponent(pid, {
    id: 'cmp_recirc_pump', type: recircDef.typeId, name: 'Recirculation Pump',
    position: { x: 320, y: 460 },
    bindings: [
      { id: 'b_pump_flow', source: 'mqtt', address: 'site/hw/recirc/flow', metric: 'flow', unit: 'L/min', ttlSeconds: 60 },
    ],
    allowedActions: [{ id: 'enable', label: 'Enable / Disable', dangerous: false }],
  }, CREATED_BY, stores);

  addComponent(pid, {
    id: 'cmp_tmv', type: tmvDef.typeId, name: 'Mixing Valve (TMV)',
    position: { x: 520, y: 200 },
    bindings: [],
  }, CREATED_BY, stores);

  addComponent(pid, {
    id: 'cmp_shower', type: pouDef.typeId, name: 'Shower',
    position: { x: 680, y: 200 },
    operationalProfileId: 'op_point_of_use_default',
    bindings: [
      { id: 'b_t3', source: 'mqtt', address: 'site/hw/shower/temp', metric: 'temperature', unit: '°C', ttlSeconds: 120 },
    ],
  }, CREATED_BY, stores);

  // -------------------------------------------------------------------------
  // Connections (6)
  // Port IDs must match the ComponentDefinition ports.
  // Medium must match both fromPort.medium and toPort.medium.
  // -------------------------------------------------------------------------

  // Tank hot_out → TMV hot_in (supply line)
  addConnection(pid, {
    id: 'cn_supply',
    fromComponentId: 'cmp_tank',   fromPortId: 'hot_out',
    toComponentId:   'cmp_tmv',    toPortId:   'hot_in',
    medium: 'hot_water', topologicalDirection: 'forward',
    bindings: [
      { id: 'b_t2_supply', source: 'mqtt', address: 'site/hw/supply/temp', metric: 'temperature', unit: '°C', ttlSeconds: 120 },
    ],
    valueBindingId:       'b_t2_supply',
    operationalProfileId: 'op_supply_default',
  }, registry, CREATED_BY, stores);

  // TMV mixed_out → Shower hot_in
  addConnection(pid, {
    id: 'cn_tmv_use',
    fromComponentId: 'cmp_tmv',    fromPortId: 'mixed_out',
    toComponentId:   'cmp_shower', toPortId:   'hot_in',
    medium: 'hot_water', topologicalDirection: 'forward',
    inferFromComponentId: 'cmp_shower',
  }, registry, CREATED_BY, stores);

  // Shower drain_out → Recirc pump in (return loop)
  addConnection(pid, {
    id: 'cn_return',
    fromComponentId: 'cmp_shower',      fromPortId: 'drain_out',
    toComponentId:   'cmp_recirc_pump', toPortId:   'in',
    medium: 'recirc', topologicalDirection: 'forward',
    bindings: [
      { id: 'b_t4_return', source: 'mqtt', address: 'site/hw/return/temp', metric: 'temperature', unit: '°C', ttlSeconds: 120 },
    ],
    valueBindingId:       'b_t4_return',
    operationalProfileId: 'op_return_default',
  }, registry, CREATED_BY, stores);

  // Recirc pump out → Tank recirc_in
  addConnection(pid, {
    id: 'cn_return_to_tank',
    fromComponentId: 'cmp_recirc_pump', fromPortId: 'out',
    toComponentId:   'cmp_tank',        toPortId:   'recirc_in',
    medium: 'recirc', topologicalDirection: 'forward',
    inferFromComponentId: 'cmp_recirc_pump',
  }, registry, CREATED_BY, stores);

  // Heat pump out → Tank heat_in_1
  addConnection(pid, {
    id: 'cn_hp_tank',
    fromComponentId: 'cmp_heatpump', fromPortId: 'out',
    toComponentId:   'cmp_tank',     toPortId:   'heat_in_1',
    medium: 'hot_water', topologicalDirection: 'forward',
    inferFromComponentId: 'cmp_tank',
  }, registry, CREATED_BY, stores);

  // Gas backup out → Tank heat_in_2
  addConnection(pid, {
    id: 'cn_gas_tank',
    fromComponentId: 'cmp_gas_backup', fromPortId: 'out',
    toComponentId:   'cmp_tank',       toPortId:   'heat_in_2',
    medium: 'hot_water', topologicalDirection: 'forward',
    inferFromComponentId: 'cmp_tank',
  }, registry, CREATED_BY, stores);

  // -------------------------------------------------------------------------
  const componentIds  = stores.graph.getComponents(pid).map(c => c.id);
  const connectionIds = stores.graph.getConnections(pid).map(c => c.id);

  return {
    componentIds,
    connectionIds,
    totalMutations: stores.versions.current(pid),
  };
}
