/**
 * AlarmBanner — critical/warning alarm strip.
 * Hidden when no active alarms. Shows highest severity + first alarm message.
 * Uses alarmStore directly for accurate active-alarm data.
 */

import React from 'react';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import { useLocale } from '../../i18n/index.js';

export interface AlarmBannerProps {
  alarmStore:  AlarmStore;
  components:  { id: string; name: string }[];
}

export function AlarmBanner({ alarmStore, components }: AlarmBannerProps) {
  const { t } = useLocale();

  // Collect all active alarms across components with their rules
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

  const bannerColor = severity === 'critical' ? 'var(--status-critical)' : 'var(--status-warning)';
  const bgColor     = severity === 'critical'
    ? 'color-mix(in srgb, var(--status-critical) 10%, var(--bg-crust))'
    : 'color-mix(in srgb, var(--status-warning) 10%, var(--bg-crust))';

  // Show highest severity alarm first
  const sorted = [...activeAlarms].sort((a, b) => {
    const rank = { critical: 2, warning: 1, info: 0 };
    return (rank[b.rule?.severity ?? 'info'] ?? 0) - (rank[a.rule?.severity ?? 'info'] ?? 0);
  });

  const primary = sorted[0]!;
  const title   = severity === 'critical'
    ? t('alarm.critical_title')
    : t('alarm.warning_title');

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          12,
      padding:      '8px 14px',
      background:   bgColor,
      borderBottom: `2px solid ${bannerColor}`,
      flexShrink:   0,
      animation:    severity === 'critical' ? 'alarmPulse 2s ease-in-out infinite' : undefined,
    }} data-testid="alarm-banner">
      <span style={{ fontSize: 13, fontWeight: 700, color: bannerColor, flexShrink: 0 }}>
        {title}
      </span>
      <span style={{ width: 1, height: 16, background: bannerColor, opacity: 0.4, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: bannerColor, fontWeight: 500 }}>
        {primary.rule?.message}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-sub)', flexShrink: 0 }}>
        {t('alarm.component_label')}: <strong style={{ color: 'var(--text-base)' }}>{primary.componentName}</strong>
      </span>
      {activeAlarms.length > 1 && (
        <>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: bannerColor, fontWeight: 600, flexShrink: 0 }}>
            {t('alarm.count_active', { count: activeAlarms.length })}
          </span>
        </>
      )}
    </div>
  );
}
