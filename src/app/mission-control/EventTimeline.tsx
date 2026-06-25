/**
 * EventTimeline — demo-derived runtime event log.
 *
 * Events are derived from:
 *   - Active / pending / recently cleared alarms in alarmStore
 *   - A synthetic "session started" event
 *
 * No backend history. No COMMAND plane. No mutations.
 */

import React, { useRef } from 'react';
import type { AlarmStore } from '../../alarm/alarm-store.js';
import { useLocale } from '../../i18n/index.js';

export interface EventTimelineProps {
  alarmStore: AlarmStore;
  components: { id: string; name: string }[];
  nowMs:      number;
}

type EventKind = 'alarm_raised' | 'alarm_pending' | 'alarm_cleared' | 'session_start';

interface TimelineEvent {
  id:            string;
  ts:            number;
  kind:          EventKind;
  message:       string;
  severity?:     'critical' | 'warning' | 'info';
  componentName: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--status-critical)',
  warning:  'var(--status-warning)',
  info:     'var(--text-sub)',
};

const KIND_ICON: Record<EventKind, string> = {
  alarm_raised:  '▲',
  alarm_pending: '◷',
  alarm_cleared: '✓',
  session_start: '⬛',
};

export function EventTimeline({ alarmStore, components, nowMs }: EventTimelineProps) {
  const { t } = useLocale();
  const sessionStartMs = useRef(Date.now()).current;

  const events: TimelineEvent[] = [];

  // Derive events from alarm states
  for (const comp of components) {
    const alarms = alarmStore.getAlarmsForComponent(comp.id);
    for (const alarm of alarms) {
      const rule = alarmStore.getAlarmRule(alarm.ruleId);
      if (!rule) continue;

      if (alarm.state === 'active') {
        events.push({
          id:            `raised-${alarm.id}`,
          ts:            Date.parse(alarm.raisedAt),
          kind:          'alarm_raised',
          message:       rule.message,
          severity:      rule.severity,
          componentName: comp.name,
        });
      } else if (alarm.state === 'pending') {
        events.push({
          id:            `pending-${alarm.id}`,
          ts:            Date.parse(alarm.raisedAt),
          kind:          'alarm_pending',
          message:       rule.message,
          severity:      rule.severity,
          componentName: comp.name,
        });
      } else if (alarm.state === 'cleared' && alarm.clearedAt) {
        events.push({
          id:            `cleared-${alarm.id}`,
          ts:            Date.parse(alarm.clearedAt),
          kind:          'alarm_cleared',
          message:       rule.message,
          severity:      'info',
          componentName: comp.name,
        });
      }
    }
  }

  // Session start event
  events.push({
    id:            'session-start',
    ts:            sessionStartMs,
    kind:          'session_start',
    message:       '',
    componentName: '',
  });

  // Sort newest first, cap at 12
  events.sort((a, b) => b.ts - a.ts);
  const visible = events.slice(0, 12);

  const relativeTime = (ts: number): string => {
    const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
    if (diffSec < 5)  return t('sys.just_now');
    if (diffSec < 60) return t('sys.seconds_ago', { count: diffSec });
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return t('sys.minutes_ago', { count: diffMin });
    return t('sys.hours_ago', { count: Math.floor(diffMin / 60) });
  };

  const kindLabel = (kind: EventKind): string => {
    const map: Record<EventKind, Parameters<typeof t>[0]> = {
      alarm_raised:  'timeline.alarm_raised',
      alarm_pending: 'timeline.alarm_pending',
      alarm_cleared: 'timeline.alarm_cleared',
      session_start: 'timeline.session_start',
    };
    return t(map[kind]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{
        padding:      '7px 12px 5px',
        fontSize:     10,
        fontWeight:   700,
        color:        'var(--text-sub)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderBottom:  '1px solid var(--border)',
        flexShrink:    0,
      }}>
        {t('timeline.title')}
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        {visible.length === 0 && (
          <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-sub)' }}>
            {t('timeline.no_events')}
          </div>
        )}
        {visible.map(ev => {
          const color = ev.severity ? (SEVERITY_COLOR[ev.severity] ?? 'var(--text-sub)') : 'var(--text-sub)';
          const icon  = KIND_ICON[ev.kind];

          return (
            <div key={ev.id} style={{
              display:    'flex',
              gap:        8,
              padding:    '5px 12px',
              borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
              alignItems: 'flex-start',
            }}>
              {/* Icon */}
              <span style={{ fontSize: 10, color, marginTop: 1, flexShrink: 0, width: 12, textAlign: 'center' }}>
                {icon}
              </span>

              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color, marginBottom: 1 }}>
                  {kindLabel(ev.kind)}
                  {ev.componentName && (
                    <span style={{ color: 'var(--text-sub)', fontWeight: 400 }}>
                      {' · '}{ev.componentName}
                    </span>
                  )}
                </div>
                {ev.message && (
                  <div style={{
                    fontSize:    9,
                    color:       'var(--text-sub)',
                    overflow:    'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:  'nowrap',
                  }}>
                    {ev.message}
                  </div>
                )}
              </div>

              {/* Relative time */}
              <span style={{ fontSize: 9, color: 'var(--text-sub)', flexShrink: 0, marginTop: 1 }}>
                {relativeTime(ev.ts)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
