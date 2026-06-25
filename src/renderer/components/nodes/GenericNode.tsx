import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation, sensorStatePresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';

const TYPE_ICON: Record<string, string> = {
  expansion_vessel:     '⊕',
  filter:               '⊡',
  air_separator:        '⊞',
  distribution_manifold:'⊢',
  tap:                  '🚰',
  electric_heater:      '⚡',
  generic:              '⬡',
};

export function GenericNode({ data }: NodeProps<ComponentNodeData>) {
  const { t } = useLocale();
  const { name, typeId, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);
  const sensorPres = sensorStatePresentation(viewModel.sensorState);

  const temp   = viewModel.liveValues['temperature'] ?? viewModel.liveValues['temp'] ?? null;
  const tempNum = typeof temp === 'number' ? temp : null;

  const healthClass =
    viewModel.health === HealthState.Critical ? 'zentro-node--critical' :
    viewModel.health === HealthState.Warning   ? 'zentro-node--warning'  :
    viewModel.health === HealthState.Healthy   ? 'zentro-node--healthy'  :
    'zentro-node--offline';

  return (
    <div className={`zentro-node ${healthClass}`} style={{ minWidth: 120 }}>
      <Handle type="target" position={Position.Left}  />
      <Handle type="source" position={Position.Right} />

      <div className="zentro-node__header">
        <span className="zentro-node__icon" aria-hidden="true">{TYPE_ICON[typeId] ?? '⬡'}</span>
        <span className="zentro-node__name">{name}</span>
      </div>

      <div className="zentro-node__body">
        {tempNum !== null && (
          <span className="zentro-node__value" style={{ color: `var(${statusPres.cssVar})` }}>
            {tempNum.toFixed(1)}
            <span className="zentro-node__unit">{t('unit.temperature')}</span>
          </span>
        )}
        <div className="zentro-node__status-row">
          <span
            className={`zentro-node__dot${sensorPres.cssVar === '--sensor-live' ? ' zentro-node__dot--blink' : ''}`}
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
