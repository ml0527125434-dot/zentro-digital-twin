import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNode, ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';

// Temp range for fill indicator: 30°C = empty, 75°C = full
const TEMP_MIN = 30;
const TEMP_MAX = 75;

function tempToFill(temp: number): number {
  return Math.max(8, Math.min(94, ((temp - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100));
}

function tempToFillColor(temp: number): string {
  if (temp < 38) return 'var(--pipe-cold)';
  if (temp < 50) return 'var(--pipe-warm)';
  if (temp < 62) return 'var(--pipe-hot)';
  return 'var(--pipe-scald)';
}

export function TankNode({ data }: NodeProps<ComponentNode>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);

  const temp = viewModel.liveValues['temp'] ?? null;
  const tempNum = typeof temp === 'number' ? temp : null;

  const fillPct   = tempNum !== null ? tempToFill(tempNum) : 20;
  const fillColor = tempNum !== null ? tempToFillColor(tempNum) : 'var(--border)';

  const healthClass =
    viewModel.health === HealthState.Critical      ? 'zentro-node--critical'     :
    viewModel.health === HealthState.Warning       ? 'zentro-node--warning'      :
    viewModel.health === HealthState.Healthy       ? 'zentro-node--healthy'      :
    viewModel.health === HealthState.Maintenance   ? 'zentro-node--maintenance'  :
    viewModel.health === HealthState.Commissioning ? 'zentro-node--commissioning':
    'zentro-node--offline';

  const isLive = sensorPres.cssVar === '--sensor-live';

  return (
    <div className={`zentro-node ${healthClass}`} style={{ width: 140 }}>
      <Handle type="target" position={Position.Bottom} id="cold_in"    />
      <Handle type="target" position={Position.Left}   id="heat_in_1"  />
      <Handle type="target" position={Position.Left}   id="heat_in_2"  style={{ top: '70%' }} />
      <Handle type="target" position={Position.Right}  id="recirc_in"  />
      <Handle type="source" position={Position.Top}    id="hot_out"    />

      {/* Header */}
      <div className="zentro-node__header">
        <span className="zentro-node__icon">🛢</span>
        <span className="zentro-node__name">{name}</span>
      </div>

      {/* Tank body with fill indicator */}
      <div style={{ padding: '6px 10px 4px' }}>
        <div className="zentro-tank-ellipse-top" />
        <div className="zentro-tank-body">
          <div
            className="zentro-tank-fill"
            style={{ height: `${fillPct}%`, background: fillColor }}
          />
        </div>
        <div className="zentro-tank-ellipse-bot" />
      </div>

      {/* Temperature readout */}
      <div className="zentro-node__body" style={{ paddingTop: 2 }}>
        {tempNum !== null ? (
          <span className="zentro-node__value" style={{ color: `var(${statusPres.cssVar})` }}>
            {tempNum.toFixed(1)}
            <span className="zentro-node__unit">{t('unit.temperature')}</span>
          </span>
        ) : (
          <span className="zentro-node__value" style={{ color: 'var(--text-dim)', fontSize: 14 }}>
            {t('kpi.no_value')}
          </span>
        )}

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
