import type { LocaleConfig, Translations } from '../types.js';

export const HE_CONFIG: LocaleConfig = {
  code:        'he',
  name:        'עברית',
  dir:         'rtl',
  switchLabel: 'EN',
  htmlLang:    'he',
};

export const HE: Translations = {
  // App chrome
  'app.title':        'זנטרו — תאום דיגיטלי',
  'app.all_clear':    '✓ הכל תקין',
  'app.alarms_count': ({ count }) =>
    count === 1 ? 'התראה אחת' : `${count} התראות`,
  'app.lang_switch':  'EN',

  // HealthState
  'health.healthy':       'תקין',
  'health.warning':       'אזהרה',
  'health.critical':      'קריטי',
  'health.offline':       'לא מחובר',
  'health.maintenance':   'תחזוקה',
  'health.commissioning': 'הפעלה',

  // NodeStatus
  'status.ok':      'תקין',
  'status.cold':    'קר',
  'status.warn':    'אזהרה',
  'status.risk':    'סיכון',
  'status.scald':   'כוויה',
  'status.fault':   'תקלה',
  'status.unknown': 'לא ידוע',

  // SensorState
  'sensor.live':    'פעיל',
  'sensor.stale':   'מיושן',
  'sensor.lost':    'אבוד',
  'sensor.unknown': 'לא ידוע',

  // FlowState
  'flow.flowing': 'זורם',
  'flow.reverse': 'זרימה הפוכה',
  'flow.noflow':  'אין זרימה',
  'flow.unknown': 'לא ידוע',

  // PumpNode
  'pump.running':   '▶ פועל',
  'pump.standby':   '◼ המתנה',
  'pump.no_data':   '? אין נתונים',
  'pump.flow_unit': 'ל/ד',

  // Units
  'unit.temperature': '°C',

  // Loading / empty states
  'flowmap.loading': 'מחשב פריסה…',
  'flowmap.empty':   'אין רכיבים להצגה',
  'dashboard.empty': 'אין רכיבים',
};
