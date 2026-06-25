import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation } from '../../theme.js';

export function PumpNode({ data }: NodeProps<ComponentNodeData>) {
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);

  return (
    <div
      style={{
        border:       `2px solid var(${healthPres.cssVar})`,
        borderRadius: '50%',
        padding:      '8px',
        width:        80,
        height:       80,
        display:      'flex',
        flexDirection: 'column',
        alignItems:   'center',
        justifyContent: 'center',
        background:   'var(--node-bg)',
      }}
    >
      <Handle type="target" position={Position.Left}  id="in"  />
      <Handle type="source" position={Position.Right} id="out" />

      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--node-label)', textAlign: 'center' }}>
        {name}
      </div>
      <div style={{ fontSize: 9, color: `var(${statusPres.cssVar})` }}>
        {statusPres.label}
      </div>
    </div>
  );
}
