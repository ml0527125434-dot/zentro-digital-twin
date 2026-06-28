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
import type { TranslationKey } from '../../i18n/index.js';

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
        {visible.map((ev, idx) => {
          const color = ev.severity ? (SEVERITY_COLOR[ev.severity] ?? 'var(--text-sub)') : 'var(--text-sub)';
          const icon  = KIND_ICON[ev.kind];
          const isLast = idx === visible.length - 1;

          return (
            <div key={ev.id} style={{
              display:    'flex',
              gap:        0,
              alignItems: 'stretch',
              padding:    '0 12px',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-mantle)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              {/* Left timeline column: dot + vertical line */}
              <div style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                flexShrink:    0,
                width:         16,
                paddingTop:    8,
              }}>
                <div style={{
                  width:        8,
                  height:       8,
                  borderRadius: '50%',
                  background:   color,
                  flexShrink:   0,
                  boxShadow:    ev.severity === 'critical' ? `0 0 6px ${color}` : 'none',
                }} />
                {!isLast && (
                  <div style={{
                    flex:       1,
                    width:      1,
                    background: 'var(--border)',
                    marginTop:  3,
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{
                flex:         1,
                minWidth:     0,
                padding:      '6px 0 6px 8px',
                borderBottom: isLast ? 'none' : '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color }}>
                    <span aria-hidden="true" style={{ marginInlineEnd: 4 }}>{icon}</span>
                    {kindLabel(ev.kind)}
                    {ev.componentName && (
                      <span style={{ color: 'var(--text-sub)', fontWeight: 400 }}>
                        {' · '}{ev.componentName}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {relativeTime(ev.ts)}
                  </span>
                </div>
                {ev.message && (
                  <div style={{
                    fontSize:    9,
                    color:       'var(--text-sub)',
                    overflow:    'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:  'nowrap',
                    marginTop:   2,
                  }}>
                    {ev.message?.startsWith('alarm.rule.')
                      ? t(ev.message as TranslationKey)
                      : ev.message}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
