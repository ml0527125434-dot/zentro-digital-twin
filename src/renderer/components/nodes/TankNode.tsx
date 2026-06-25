import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';

export function TankNode({ data }: NodeProps<ComponentNodeData>) {
  const { name, viewModel } = data;
  const healthPres  = healthPresentation(viewModel.health);
  const statusPres  = nodeStatusPresentation(viewModel.operationalStatus);
  const sensorPres  = sensorStatePresentation(viewModel.sensorState);

  const temp = viewModel.liveValues['temp'] ?? null;

  const alarmCount = viewModel.activeAlarms.filter(a => a.state === 'active').length;

  return (
    <div
      style={{
        border:       `2px solid var(${healthPres.cssVar})`,
        borderRadius: 8,
        padding:      '8px 12px',
        background:   'var(--node-bg)',
        minWidth:     140,
        position:     'relative',
      }}
    >
      {/* Ports */}
      <Handle type="target" position={Position.Bottom} id="cold_in"    />
      <Handle type="target" position={Position.Left}   id="heat_in_1"  />
      <Handle type="target" position={Position.Left}   id="heat_in_2"  style={{ top: '70%' }} />
      <Handle type="target" position={Position.Right}  id="recirc_in"  />
      <Handle type="source" position={Position.Top}    id="hot_out"    />

      {alarmCount > 0 && (
        <span style={{
          position:   'absolute', top: -6, right: -6,
          background: 'var(--status-critical)', color: '#fff',
          borderRadius: '50%', width: 16, height: 16,
          fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700,
        }}>
          {alarmCount}
        </span>
      )}

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--node-label)', marginBottom: 4 }}>
        {name}
      </div>
      {temp !== null && (
        <div style={{ fontSize: 13, color: `var(${statusPres.cssVar})` }}>
          {typeof temp === 'number' ? temp.toFixed(1) : String(temp)}°C
        </div>
      )}
      <div style={{ fontSize: 9, color: `var(${sensorPres.cssVar})`, marginTop: 2 }}>
        {sensorPres.icon} {sensorPres.label}
      </div>
    </div>
  );
}
