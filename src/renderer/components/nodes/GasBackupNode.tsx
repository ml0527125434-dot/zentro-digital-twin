import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode, ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';
import { AlarmBadge } from './AlarmBadge.js';

export function GasBackupNode({ data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);
  const isLive     = sensorPres.cssVar === '--sensor-live';

  const runtime = viewModel.liveValues['runtime'];
  const hasRuntime = runtime !== null && runtime !== undefined;
  const isRunning  = hasRuntime && (typeof runtime === 'number' ? runtime > 0.5 : runtime === true);

  const healthClass =
    viewModel.health === HealthState.Critical      ? 'zentro-node--critical'     :
    viewModel.health === HealthState.Warning       ? 'zentro-node--warning'      :
    viewModel.health === HealthState.Healthy       ? 'zentro-node--healthy'      :
    viewModel.health === HealthState.Maintenance   ? 'zentro-node--maintenance'  :
    viewModel.health === HealthState.Commissioning ? 'zentro-node--commissioning':
    'zentro-node--offline';

  const runColor   = isRunning ? 'var(--pipe-hot)' : 'var(--text-sub)';
  const runLabel   = !hasRuntime ? t('pump.no_data') : isRunning ? t('kpi.running') : t('kpi.standby');
  const alarmCount = viewModel.activeAlarms.length;

  return (
    <div className={`zentro-node ${healthClass}`} style={{ width: 130 }}>
      <AlarmBadge count={alarmCount} />
      <Handle type="source" position={Position.Right} id="out" />

      <div className="zentro-node__header">
        <span className="zentro-node__icon">🔥</span>
        <span className="zentro-node__name">{name}</span>
      </div>

      <div className="zentro-node__body">
        {/* Flame visual — glows when running */}
        <div style={{
          textAlign:  'center',
          fontSize:   28,
          lineHeight: 1,
          filter:     isRunning ? 'drop-shadow(0 0 6px var(--pipe-hot))' : 'grayscale(0.8) opacity(0.4)',
          margin:     '3px 0',
          transition: 'filter 0.5s',
        }} aria-hidden="true">
          🔥
        </div>

        <span className="zentro-node__value" style={{ color: runColor, fontSize: 13 }}>
          {runLabel}
        </span>

        <div className="zentro-node__status-row">
          <span
            className={`zentro-node__dot${isLive ? ' zentro-node__dot--blink' : ''}`}
            style={{ background: `var(${sensorPres.cssVar})` }}
          />
          <span className="zentro-node__sub">
            {t(healthPres.label as TranslationKey)}
          </span>
        </div>
      </div>
    </div>
  );
}
