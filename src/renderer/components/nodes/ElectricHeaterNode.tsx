import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';

export function ElectricHeaterNode({ data }: NodeProps<ComponentNodeData>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const { health, operationalStatus, liveValues } = viewModel;

  const isRunning = typeof liveValues?.['runtime'] === 'boolean'
    ? liveValues.runtime
    : typeof liveValues?.['runtime'] === 'number'
      ? liveValues.runtime > 0
      : false;

  const temp     = typeof liveValues?.['temp'] === 'number' ? liveValues.temp : null;
  const statusPres = operationalStatus ? nodeStatusPresentation(operationalStatus) : null;
  const sensorPres = sensorStatePresentation(viewModel.sensorState);
  const tempColor  = statusPres ? `var(${statusPres.cssVar})` : 'var(--text-base)';
  const isLive     = sensorPres.cssVar === '--sensor-live';

  const healthClass =
    health === HealthState.Critical     ? 'zentro-node--critical'     :
    health === HealthState.Warning      ? 'zentro-node--warning'      :
    health === HealthState.Healthy      ? 'zentro-node--healthy'      :
    health === HealthState.Maintenance  ? 'zentro-node--maintenance'  :
    health === HealthState.Commissioning? 'zentro-node--commissioning':
    'zentro-node--offline';

  return (
    <div
      className={`zentro-node ${healthClass}`}
      style={{
        background:  isRunning ? 'var(--node-bg-hot)' : 'var(--bg-mantle)',
        padding:     '8px 12px',
        minWidth:    120,
        display:     'flex',
        flexDirection:'column',
        alignItems:  'center',
        gap:         4,
        boxShadow:   isRunning ? 'var(--shadow-card), 0 0 10px rgba(251,191,36,0.15)' : 'var(--shadow-card)',
        transition:  'background 0.4s, box-shadow 0.4s',
        position:    'relative',
      }}
    >
      <Handle type="target" position={Position.Left}  id="water_in"  style={{ background: 'var(--pipe-cold)', width: 7, height: 7 }} />
      <Handle type="source" position={Position.Right} id="water_out" style={{ background: 'var(--pipe-hot)',  width: 7, height: 7 }} />

      <span style={{
        fontSize:  22,
        lineHeight: 1,
        filter:    isRunning ? 'drop-shadow(0 0 5px rgba(251,191,36,0.8))' : 'none',
        transition: 'filter 0.4s',
      }}>
        ⚡
      </span>

      <span style={{
        fontSize:     10,
        fontWeight:   700,
        color:        'var(--text-base)',
        textAlign:    'center',
        maxWidth:     110,
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
      }}>
        {name}
      </span>

      {temp !== null ? (
        <span style={{ fontSize: 11, fontWeight: 700, color: tempColor }}>{temp.toFixed(1)}°C</span>
      ) : (
        <span style={{ fontSize: 9, color: isRunning ? 'var(--status-healthy)' : 'var(--text-dim)' }}>
          {isRunning ? t('kpi.running') : t('kpi.standby')}
        </span>
      )}

      <span
        className={`zentro-node__dot${isLive ? ' zentro-node__dot--blink' : ''}`}
        style={{ background: `var(${sensorPres.cssVar})` }}
      />
    </div>
  );
}
