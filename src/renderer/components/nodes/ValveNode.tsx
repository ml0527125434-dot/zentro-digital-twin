import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation } from '../../theme.js';

export function ValveNode({ data }: NodeProps<ComponentNodeData>) {
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);

  return (
    <div
      style={{
        border:       `2px solid var(${healthPres.cssVar})`,
        borderRadius: 4,
        padding:      '6px 10px',
        background:   'var(--node-bg)',
        minWidth:     100,
        textAlign:    'center',
      }}
    >
      <Handle type="target" position={Position.Left}  id="hot_in"   />
      <Handle type="target" position={Position.Bottom} id="cold_in"  />
      <Handle type="source" position={Position.Right}  id="mixed_out" />

      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--node-label)' }}>
        {name}
      </div>
      <div style={{ fontSize: 9, color: `var(${healthPres.cssVar})` }}>
        {healthPres.icon}
      </div>
    </div>
  );
}
