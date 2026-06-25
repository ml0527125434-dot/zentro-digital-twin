import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';

export function ValveNode({ data }: NodeProps<ComponentNodeData>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);
  const isLive     = sensorPres.cssVar === '--sensor-live';

  // Live valve state: open (boolean), position (0–100 %), or temperature
  const openRaw   = viewModel.liveValues['open'] ?? viewModel.liveValues['position'] ?? null;
  const tempRaw   = viewModel.liveValues['temp'] ?? null;

  const isOpen = typeof openRaw === 'boolean'
    ? openRaw
    : typeof openRaw === 'number'
      ? openRaw > 50
      : null;

  const positionPct = typeof openRaw === 'number'
    ? Math.round(openRaw)
    : null;

  const stateColor = isOpen === true
    ? 'var(--status-healthy)'
    : isOpen === false
      ? 'var(--status-offline)'
      : 'var(--text-dim)';

  const stateLabel = isOpen === true
    ? t('valve.open')
    : isOpen === false
      ? t('valve.closed')
      : null;

  const diamondClass =
    viewModel.health === HealthState.Critical      ? 'zentro-valve-diamond--critical'     :
    viewModel.health === HealthState.Warning       ? 'zentro-valve-diamond--warning'      :
    viewModel.health === HealthState.Healthy       ? 'zentro-valve-diamond--healthy'      :
    viewModel.health === HealthState.Maintenance   ? 'zentro-valve-diamond--maintenance'  :
    viewModel.health === HealthState.Commissioning ? 'zentro-valve-diamond--commissioning':
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
        {stateLabel ? (
          <span style={{ fontSize: 7, color: stateColor, marginTop: 1, fontWeight: 700 }}>
            {positionPct !== null ? `${positionPct}%` : stateLabel}
          </span>
        ) : typeof tempRaw === 'number' ? (
          <span style={{ fontSize: 7.5, color: 'var(--pipe-warm)', marginTop: 1, fontWeight: 700 }}>
            {tempRaw.toFixed(1)}{t('unit.temperature')}
          </span>
        ) : (
          <span style={{ fontSize: 8, color: `var(${healthPres.cssVar})`, marginTop: 1 }}>
            {healthPres.icon}
          </span>
        )}
        <span
          className={`zentro-node__dot${isLive ? ' zentro-node__dot--blink' : ''}`}
          style={{ background: `var(${sensorPres.cssVar})`, marginTop: 2 }}
        />
      </div>
    </div>
  );
}
