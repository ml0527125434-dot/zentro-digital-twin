/**
 * Stage 3 smoke tests — renderer components render without crashing.
 * All ViewModels are Unknown/default. No business logic assertions.
 *
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HealthState, NodeStatus, SensorState, ValueProvenance, FlowState } from '../../domain/types.js';
import type { ComponentViewModel, ConnectionViewModel } from '../../domain/types.js';
import type { ComponentNodeData, ConnectionEdgeData } from '../flow-transformers.js';

// ---------------------------------------------------------------------------
// Mock @xyflow/react — node/edge primitives require ReactFlow canvas context.
// Smoke tests only need to confirm rendering without crashing.
// ---------------------------------------------------------------------------

vi.mock('@xyflow/react', () => ({
  Handle:            () => null,
  BaseEdge:          () => null,
  EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  getBezierPath:     () => ['M0 0', 0, 0] as [string, number, number],
  Position: {
    Left:   'left',
    Right:  'right',
    Top:    'top',
    Bottom: 'bottom',
  },
}));

// ---------------------------------------------------------------------------
// Default ViewModels (all Unknown / empty)
// ---------------------------------------------------------------------------

const DEFAULT_VM: ComponentViewModel = {
  componentId:       'cmp_test',
  health:            HealthState.Offline,
  operationalStatus: NodeStatus.Unknown,
  sensorState:       SensorState.Unknown,
  provenance:        ValueProvenance.Unknown,
  liveValues:        {},
  activeCommands:    [],
  activeAlarms:      [],
};

const DEFAULT_CONN_VM: ConnectionViewModel = {
  connectionId: 'cn_test',
  flow:         FlowState.Unknown,
  value:        null,
  status:       NodeStatus.Unknown,
  sensorState:  SensorState.Unknown,
  provenance:   ValueProvenance.Unknown,
};

function makeNodeData(overrides: Partial<ComponentNodeData> = {}): ComponentNodeData {
  return {
    componentId: 'cmp_test',
    name:        'Test Component',
    typeId:      'generic',
    viewModel:   DEFAULT_VM,
    ...overrides,
  };
}

// Minimal NodeProps shape the components use
function nodeProps(data: ComponentNodeData) {
  return { data } as never;
}

// Minimal EdgeProps shape FlowEdge uses
function edgeProps(data: ConnectionEdgeData) {
  return {
    id:             'cn_test',
    sourceX:        0,
    sourceY:        0,
    targetX:        100,
    targetY:        100,
    sourcePosition: 'right',
    targetPosition: 'left',
    data,
  } as never;
}

// ---------------------------------------------------------------------------
// Imports after mock setup
// ---------------------------------------------------------------------------

const { GenericNode }   = await import('./nodes/GenericNode.js');
const { TankNode }      = await import('./nodes/TankNode.js');
const { PumpNode }      = await import('./nodes/PumpNode.js');
const { ValveNode }     = await import('./nodes/ValveNode.js');
const { HeatPumpNode }  = await import('./nodes/HeatPumpNode.js');
const { GasBackupNode } = await import('./nodes/GasBackupNode.js');
const { ShowerNode }    = await import('./nodes/ShowerNode.js');
const { FlowEdge }      = await import('./edges/FlowEdge.js');

// ---------------------------------------------------------------------------
// Smoke tests
// ---------------------------------------------------------------------------

describe('GenericNode — smoke', () => {
  it('renders without crashing with default Unknown ViewModel', () => {
    const { container } = render(<GenericNode {...nodeProps(makeNodeData())} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('displays component name', () => {
    const { getByText } = render(
      <GenericNode {...nodeProps(makeNodeData({ name: 'Main Pump' }))} />,
    );
    expect(getByText('Main Pump')).toBeTruthy();
  });
});

describe('TankNode — smoke', () => {
  it('renders without crashing with default Unknown ViewModel', () => {
    const { container } = render(<TankNode {...nodeProps(makeNodeData({ typeId: 'storage_tank' }))} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders temp value when liveValues contains temp', () => {
    const vm: ComponentViewModel = { ...DEFAULT_VM, liveValues: { temp: 62 } };
    const { getByText } = render(
      <TankNode {...nodeProps(makeNodeData({ viewModel: vm }))} />,
    );
    expect(getByText(/62/)).toBeTruthy();
  });

  it('renders without crashing when liveValues is empty', () => {
    const { container } = render(<TankNode {...nodeProps(makeNodeData())} />);
    expect(container.firstChild).not.toBeNull();
  });
});

describe('PumpNode — smoke', () => {
  it('renders without crashing with default Unknown ViewModel', () => {
    const { container } = render(<PumpNode {...nodeProps(makeNodeData({ typeId: 'recirc_pump' }))} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('displays component name', () => {
    const { getByText } = render(
      <PumpNode {...nodeProps(makeNodeData({ name: 'Recirc Pump' }))} />,
    );
    expect(getByText('Recirc Pump')).toBeTruthy();
  });
});

describe('ValveNode — smoke', () => {
  it('renders without crashing with default Unknown ViewModel', () => {
    const { container } = render(<ValveNode {...nodeProps(makeNodeData({ typeId: 'mixing_valve' }))} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('displays component name', () => {
    const { getByText } = render(
      <ValveNode {...nodeProps(makeNodeData({ name: 'TMV' }))} />,
    );
    expect(getByText('TMV')).toBeTruthy();
  });
});

describe('HeatPumpNode — smoke', () => {
  it('renders without crashing with default ViewModel', () => {
    const { container } = render(<HeatPumpNode {...nodeProps(makeNodeData({ typeId: 'heat_pump' }))} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('displays component name', () => {
    const { getByText } = render(
      <HeatPumpNode {...nodeProps(makeNodeData({ name: 'Heat Pump' }))} />,
    );
    expect(getByText('Heat Pump')).toBeTruthy();
  });
});

describe('GasBackupNode — smoke', () => {
  it('renders without crashing with default ViewModel', () => {
    const { container } = render(<GasBackupNode {...nodeProps(makeNodeData({ typeId: 'gas_backup' }))} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('displays component name', () => {
    const { getByText } = render(
      <GasBackupNode {...nodeProps(makeNodeData({ name: 'Gas Backup' }))} />,
    );
    expect(getByText('Gas Backup')).toBeTruthy();
  });
});

describe('ShowerNode — smoke', () => {
  it('renders without crashing with default ViewModel', () => {
    const { container } = render(<ShowerNode {...nodeProps(makeNodeData({ typeId: 'point_of_use' }))} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('displays component name', () => {
    const { getByText } = render(
      <ShowerNode {...nodeProps(makeNodeData({ name: 'Shower' }))} />,
    );
    expect(getByText('Shower')).toBeTruthy();
  });

  it('renders temperature when liveValues contains temp', () => {
    const vm: ComponentViewModel = { ...DEFAULT_VM, liveValues: { temp: 48 } };
    const { getByText } = render(
      <ShowerNode {...nodeProps(makeNodeData({ viewModel: vm }))} />,
    );
    expect(getByText(/48/)).toBeTruthy();
  });
});

describe('FlowEdge — smoke', () => {
  it('renders without crashing with Unknown flow and sensorState', () => {
    const data: ConnectionEdgeData = {
      connectionId: 'cn_test',
      viewModel:    DEFAULT_CONN_VM,
      animated:     false,
    };
    const { container } = render(<FlowEdge {...edgeProps(data)} />);
    expect(container).not.toBeNull();
  });

  it('renders without crashing when flow === Flowing', () => {
    const data: ConnectionEdgeData = {
      connectionId: 'cn_test',
      viewModel:    { ...DEFAULT_CONN_VM, flow: FlowState.Flowing, sensorState: SensorState.Live },
      animated:     true,
    };
    expect(() => render(<FlowEdge {...edgeProps(data)} />)).not.toThrow();
  });

  it('renders without crashing when data is undefined', () => {
    expect(() => render(<FlowEdge {...edgeProps(undefined as never)} />)).not.toThrow();
  });
});
