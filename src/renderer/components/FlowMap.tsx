/**
 * Zentro Digital Twin — FlowMap (Stage 23 visual update)
 *
 * Presentation-only canvas. Receives pre-computed nodes and edges.
 * Grid background for plant-room schematic feel.
 */

import React, { useRef, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  SelectionMode,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type NodeChange,
  type OnSelectionChangeParams,
  type Connection as RFConnection,
} from '@xyflow/react';
import type { ComponentNode, ConnectionEdge } from '../flow-transformers.js';
import { TankNode }           from './nodes/TankNode.js';
import { PumpNode }           from './nodes/PumpNode.js';
import { ValveNode }          from './nodes/ValveNode.js';
import { HeatPumpNode }       from './nodes/HeatPumpNode.js';
import { GasBackupNode }      from './nodes/GasBackupNode.js';
import { ShowerNode }         from './nodes/ShowerNode.js';
import { GenericNode }        from './nodes/GenericNode.js';
import { SensorNode }         from './nodes/SensorNode.js';
import { ExchangerNode }      from './nodes/ExchangerNode.js';
import { ElectricHeaterNode } from './nodes/ElectricHeaterNode.js';
import { FlowEdge }           from './edges/FlowEdge.js';

const NODE_TYPES: NodeTypes = {
  // Base library
  storage_tank:          TankNode           as never,
  heat_pump:             HeatPumpNode       as never,
  recirc_pump:           PumpNode           as never,
  mixing_valve:          ValveNode          as never,
  // Hot-water library — sources
  gas_backup:            GasBackupNode      as never,
  electric_heater:       ElectricHeaterNode as never,
  solar_collector:       ExchangerNode      as never,
  plate_heat_exchanger:  ExchangerNode      as never,
  // Storage
  buffer_tank:           TankNode           as never,
  expansion_vessel:      GenericNode        as never,
  // Pumps
  variable_speed_pump:   PumpNode           as never,
  // Consumers
  point_of_use:          ShowerNode         as never,
  tap:                   ShowerNode         as never,
  // Valves
  control_valve:         ValveNode          as never,
  isolation_valve:       ValveNode          as never,
  safety_valve:          ValveNode          as never,
  // Sensors
  temperature_sensor:    SensorNode         as never,
  pressure_sensor:       SensorNode         as never,
  flow_sensor:           SensorNode         as never,
  // Meters
  energy_meter:          SensorNode         as never,
  water_meter:           SensorNode         as never,
  // Auxiliary
  filter:                GenericNode        as never,
  air_separator:         GenericNode        as never,
  // Distribution
  distribution_manifold: GenericNode        as never,
  // Fallback
  generic:               GenericNode        as never,
};

const EDGE_TYPES: EdgeTypes = {
  flowEdge: FlowEdge as never,
};

export interface FlowMapProps {
  nodes: ComponentNode[];
  edges: ConnectionEdge[];
  onNodeClick?:          ((componentId: string) => void) | undefined;
  onEdgeClick?:          ((connectionId: string) => void) | undefined;
  onPaneClick?:          (() => void) | undefined;
  onSelectionChange?:    ((ids: string[]) => void) | undefined;
  onNodeContextMenu?:    ((componentId: string, x: number, y: number) => void) | undefined;
  onConnect?:            ((sourceId: string, sourceHandle: string, targetId: string, targetHandle: string) => void) | undefined;
  onEdgeDelete?:         ((edgeId: string) => void) | undefined;
  onNodeMoved?:          ((nodeId: string, x: number, y: number) => void) | undefined;
  onDropComponent?:      ((typeId: string, x: number, y: number) => void) | undefined;
  placingMode?:          boolean | undefined;
  builderMode?:          boolean | undefined;
  isValidConnection?:    ((conn: RFConnection | Edge) => boolean) | undefined;
}

// Inner component: has access to useReactFlow() which requires being inside <ReactFlow>
function DropZoneCapture({ onDropComponent }: { onDropComponent?: ((typeId: string, x: number, y: number) => void) | undefined }) {
  const { screenToFlowPosition } = useReactFlow();

  React.useEffect(() => {
    if (!onDropComponent) return;
    const container = document.querySelector('[data-flowmap-drop]') as HTMLElement | null;
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('application/zentro-type')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        container.classList.add('flowmap-drag-active');
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!container.contains(e.relatedTarget as Node | null)) {
        container.classList.remove('flowmap-drag-active');
      }
    };

    const handleDrop = (e: DragEvent) => {
      container.classList.remove('flowmap-drag-active');
      const typeId = e.dataTransfer?.getData('application/zentro-type');
      if (!typeId) return;
      e.preventDefault();
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onDropComponent(typeId, pos.x, pos.y);
    };

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
      container.classList.remove('flowmap-drag-active');
    };
  }, [onDropComponent, screenToFlowPosition]);

  return null;
}

export function FlowMap({ nodes, edges, onNodeClick, onEdgeClick, onPaneClick, onSelectionChange, onNodeContextMenu, onConnect, onEdgeDelete, onNodeMoved, onDropComponent, placingMode, builderMode, isValidConnection }: FlowMapProps) {
  // Track measured dimensions per node ID so RF preserves handleBounds across
  // re-renders where buildFlowGraph creates new node object references every tick.
  // Without this, adoptUserNodes resets measured/handleBounds on every 1s refresh,
  // keeping nodes permanently visibility:hidden and edges unrendered.
  const measuredRef = useRef<Map<string, { width: number; height: number }>>(new Map());

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'dimensions' && change.dimensions) {
        measuredRef.current.set(change.id, change.dimensions);
      }
    }
  }, []);

  const stableNodes = useMemo(() =>
    nodes.map(node => {
      const measured = measuredRef.current.get(node.id);
      return measured ? { ...node, measured } : node;
    }),
    [nodes],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgeClick?.(edge.id);
    },
    [onEdgeClick],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes }: OnSelectionChangeParams) => {
      onSelectionChange?.(selNodes.map(n => n.id));
    },
    [onSelectionChange],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      onNodeContextMenu?.(node.id, event.clientX, event.clientY);
    },
    [onNodeContextMenu],
  );

  const handleConnect = useCallback(
    (params: RFConnection) => {
      if (!params.source || !params.target) return;
      onConnect?.(
        params.source,
        params.sourceHandle ?? 'out',
        params.target,
        params.targetHandle ?? 'in',
      );
    },
    [onConnect],
  );

  const handleEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      for (const e of deletedEdges) onEdgeDelete?.(e.id);
    },
    [onEdgeDelete],
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeMoved?.(node.id, node.position.x, node.position.y);
    },
    [onNodeMoved],
  );

  return (
    <div
      data-flowmap-drop
      data-flowmap-build={builderMode || undefined}
      style={{ width: '100%', height: '100%', cursor: placingMode ? 'crosshair' : 'default' }}
    >
      {/* @ts-expect-error — exactOptionalPropertyTypes conflicts with @xyflow/react prop signatures */}
      <ReactFlow
        nodes={stableNodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={2}
        onNodeClick={onNodeClick ? handleNodeClick : undefined}
        onEdgeClick={onEdgeClick ? handleEdgeClick : undefined}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange ? handleSelectionChange : undefined}
        onNodeContextMenu={onNodeContextMenu ? handleNodeContextMenu : undefined}
        onConnect={onConnect ? handleConnect : undefined}
        onEdgesDelete={onEdgeDelete ? handleEdgesDelete : undefined}
        onNodeDragStop={onNodeMoved ? handleNodeDragStop as never : undefined}
        deleteKeyCode={builderMode ? 'Delete' : null}
        multiSelectionKeyCode={builderMode ? 'Shift' : null}
        selectionOnDrag={builderMode && !placingMode}
        selectionMode={SelectionMode.Partial}
        snapToGrid={builderMode}
        snapGrid={[20, 20]}
        isValidConnection={isValidConnection as never}
        connectionRadius={28}
        connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 2.5 }}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={32}
          size={0.5}
          color="var(--border)"
        />
        <Controls showInteractive={false} />
        <DropZoneCapture onDropComponent={onDropComponent} />
      </ReactFlow>
    </div>
  );
}
