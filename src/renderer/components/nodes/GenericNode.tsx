import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation } from '../../theme.js';

export function GenericNode({ data }: NodeProps<ComponentNodeData>) {
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);

  return (
    <div
      style={{
        border:      `2px solid var(${healthPres.cssVar})`,
        borderRadius: 6,
        padding:     '6px 10px',
        background:  'var(--node-bg)',
        minWidth:    120,
      }}
    >
      <Handle type="target" position={Position.Left}  />
      <Handle type="source" position={Position.Right} />
      <div style={{ fontSize: 11, color: 'var(--node-label)', marginBottom: 2 }}>
        {name}
      </div>
      <div style={{ fontSize: 10, color: `var(${statusPres.cssVar})` }}>
        {healthPres.icon} {healthPres.label}
      </div>
    </div>
  );
}
