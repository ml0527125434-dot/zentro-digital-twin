import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';

export function PumpNode({ data }: NodeProps<ComponentNodeData>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);

  const runtime  = viewModel.liveValues['runtime'];
  const flowRate = viewModel.liveValues['flow'];

  const hasRuntime = runtime !== null && runtime !== undefined;
  const isRunning  = hasRuntime && (typeof runtime === 'number' ? runtime > 0.5 : runtime === true);

  const runColor = isRunning ? 'var(--status-healthy)' : 'var(--text-sub)';
  const runLabel = !hasRuntime
    ? t('pump.no_data')
    : isRunning ? t('pump.running') : t('pump.standby');

  const healthClass =
    viewModel.health === HealthState.Critical ? 'zentro-pump-wrapper--critical' :
    viewModel.health === HealthState.Warning   ? 'zentro-pump-wrapper--warning'  :
    viewModel.health === HealthState.Healthy   ? 'zentro-pump-wrapper--healthy'  :
    '';

  return (
    <div className={`zentro-pump-wrapper ${healthClass}`} style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left}  id="in"  />
      <Handle type="source" position={Position.Right} id="out" />

      {/* Impeller icon — spins when running */}
      <span
        className={`zentro-pump-impeller${isRunning ? ' zentro-pump-impeller--running' : ''}`}
        aria-hidden="true"
      >
        ◎
      </span>

      <span className="zentro-pump-name">{name}</span>

      <span className="zentro-pump-state" style={{ color: runColor }}>
        {runLabel}
      </span>

      {flowRate !== null && flowRate !== undefined && (
        <span className="zentro-pump-state" style={{ color: 'var(--text-dim)', fontSize: 7.5 }}>
          {typeof flowRate === 'number' ? flowRate.toFixed(1) : String(flowRate)} {t('pump.flow_unit')}
        </span>
      )}
    </div>
  );
}
