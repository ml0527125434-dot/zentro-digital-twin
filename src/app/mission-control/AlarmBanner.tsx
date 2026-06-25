/**
 * AlarmBanner — critical/warning alarm strip. Stage 23 visual polish.
 * Hidden when no active alarms. Uses alarmStore directly.
 */

import React from 'react';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';

export interface AlarmBannerProps {
  alarmStore:  AlarmStore;
  components:  { id: string; name: string }[];
}

export function AlarmBanner({ alarmStore, components }: AlarmBannerProps) {
  const { t } = useLocale();

  const activeAlarms = components.flatMap(c =>
    alarmStore.getAlarmsForComponent(c.id)
      .filter(a => a.state === 'active' || a.state === 'pending')
      .map(alarm => {
        const rule = alarmStore.getAlarmRule(alarm.ruleId);
        return { alarm, rule, componentName: c.name };
      })
      .filter(x => x.rule !== undefined),
  );

  if (activeAlarms.length === 0) return null;

  const hasCritical = activeAlarms.some(x => x.rule?.severity === 'critical');
  const severity    = hasCritical ? 'critical' : 'warning';

  const bannerBg = severity === 'critical'
    ? 'linear-gradient(90deg, color-mix(in srgb, var(--status-critical) 18%, var(--bg-crust)), var(--bg-crust))'
    : 'linear-gradient(90deg, color-mix(in srgb, var(--status-warning) 15%, var(--bg-crust)), var(--bg-crust))';
  const accentColor  = severity === 'critical' ? 'var(--status-critical)' : 'var(--status-warning)';
  const glowStyle    = severity === 'critical'  ? 'var(--glow-critical)' : 'var(--glow-warning)';

  const sorted = [...activeAlarms].sort((a, b) => {
    const rank = { critical: 2, warning: 1, info: 0 };
    return (rank[b.rule?.severity ?? 'info'] ?? 0) - (rank[a.rule?.severity ?? 'info'] ?? 0);
  });
  const primary = sorted[0]!;

  const title = severity === 'critical' ? t('alarm.critical_title') : t('alarm.warning_title');

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          12,
      padding:      '8px 16px',
      background:   bannerBg,
      borderBottom: `2px solid ${accentColor}`,
      flexShrink:   0,
      boxShadow:    glowStyle,
      animation:    severity === 'critical' ? 'alarmPulse 2s ease-in-out infinite' : undefined,
    }} data-testid="alarm-banner">

      {/* Severity badge */}
      <span style={{
        background:   accentColor,
        color:        '#fff',
        borderRadius: 4,
        padding:      '2px 8px',
        fontSize:     10,
        fontWeight:   800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        flexShrink:   0,
      }}>
        {title}
      </span>

      {/* Divider */}
      <span style={{ width: 1, height: 18, background: accentColor, opacity: 0.4, flexShrink: 0 }} />

      {/* Alarm message */}
      <span style={{ fontSize: 12, color: accentColor, fontWeight: 600 }}>
        {primary.rule?.message?.startsWith('alarm.rule.') ? t(primary.rule.message as TranslationKey) : primary.rule?.message}
      </span>

      {/* Component attribution */}
      <span style={{ fontSize: 10, color: 'var(--text-sub)', flexShrink: 0 }}>
        {t('alarm.component_label')}:{' '}
        <strong style={{ color: 'var(--text-base)' }}>{primary.componentName}</strong>
      </span>

      {activeAlarms.length > 1 && (
        <>
          <span style={{ flex: 1 }} />
          <span style={{
            fontSize:     10,
            color:        accentColor,
            fontWeight:   700,
            flexShrink:   0,
            background:   `color-mix(in srgb, ${accentColor} 15%, transparent)`,
            padding:      '2px 8px',
            borderRadius: 10,
            border:       `1px solid ${accentColor}`,
          }}>
            {t('alarm.count_active', { count: activeAlarms.length })}
          </span>
        </>
      )}
    </div>
  );
}
