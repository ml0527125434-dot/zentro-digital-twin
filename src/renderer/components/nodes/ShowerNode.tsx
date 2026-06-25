import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentNodeData } from '../../flow-transformers.js';
import { healthPresentation, nodeStatusPresentation } from '../../theme.js';
import { HealthState } from '../../../domain/types.js';
import { useLocale } from '../../../i18n/index.js';
import type { TranslationKey } from '../../../i18n/index.js';

export function ShowerNode({ data }: NodeProps<ComponentNodeData>) {
  const { t } = useLocale();
  const { name, viewModel } = data;
  const healthPres = healthPresentation(viewModel.health);
  const statusPres = nodeStatusPresentation(viewModel.operationalStatus);

  const temp = viewModel.liveValues['temperature'] ?? viewModel.liveValues['temp'] ?? null;
  const tempNum = typeof temp === 'number' ? temp : null;

  const healthClass =
    viewModel.health === HealthState.Critical ? 'zentro-node--critical' :
    viewModel.health === HealthState.Warning   ? 'zentro-node--warning'  :
    viewModel.health === HealthState.Healthy   ? 'zentro-node--healthy'  :
    'zentro-node--offline';

  const dropColor = tempNum !== null
    ? `var(${statusPres.cssVar})`
    : 'var(--pipe-cold)';

  return (
    <div className={`zentro-node ${healthClass}`} style={{ width: 110 }}>
      <Handle type="target" position={Position.Left}  id="hot_in"    />
      <Handle type="source" position={Position.Right} id="drain_out" />

      <div className="zentro-node__header">
        <span className="zentro-node__icon">🚿</span>
        <span className="zentro-node__name">{name}</span>
      </div>

      <div className="zentro-node__body">
        {/* Water drops visual */}
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          gap:            5,
          fontSize:       14,
          color:          dropColor,
          margin:         '2px 0',
          transition:     'color 0.5s',
        }} aria-hidden="true">
          {'💧'.repeat(3)}
        </div>

        {tempNum !== null ? (
          <span className="zentro-node__value" style={{ color: `var(${statusPres.cssVar})`, fontSize: 16 }}>
            {tempNum.toFixed(1)}
            <span className="zentro-node__unit">{t('unit.temperature')}</span>
          </span>
        ) : (
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {t('kpi.no_value')}
          </span>
        )}

        <div className="zentro-node__status-row">
          <span className="zentro-node__dot" style={{ background: `var(${healthPres.cssVar})` }} />
          <span className="zentro-node__sub">
            {t(healthPres.label as TranslationKey)}
          </span>
        </div>
      </div>
    </div>
  );
}
