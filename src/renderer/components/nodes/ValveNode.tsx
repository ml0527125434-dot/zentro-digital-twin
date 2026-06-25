import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';

export function ValveNode({ data }: NodeProps<ComponentNodeData>) {
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);

  const diamondClass =
    viewModel.health === HealthState.Critical ? 'zentro-valve-diamond--critical' :
    viewModel.health === HealthState.Warning   ? 'zentro-valve-diamond--warning'  :
    viewModel.health === HealthState.Healthy   ? 'zentro-valve-diamond--healthy'  :
    '';

  return (
    <div className="zentro-valve-wrapper" style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left}   id="hot_in"    />
      <Handle type="target" position={Position.Bottom} id="cold_in"   />
      <Handle type="source" position={Position.Right}  id="mixed_out" />

      <div className={`zentro-valve-diamond ${diamondClass}`} />

      <div className="zentro-valve-inner">
        <span className="zentro-valve-icon" aria-hidden="true">⬡</span>
        <span className="zentro-valve-name">{name}</span>
        <span style={{ fontSize: 8, color: `var(${healthPres.cssVar})`, marginTop: 1 }}>
          {healthPres.icon}
        </span>
      </div>
    </div>
  );
}
