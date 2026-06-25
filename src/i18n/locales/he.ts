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

  // ── Stage 22: Mission Control ─────────────────────────────────────────────

  // System status bar
  'sys.health':             'בריאות המערכת',
  'sys.last_update':        'עדכון אחרון',
  'sys.demo_mode':          'מצב הדגמה',
  'sys.all_sensors_live':   'כל החיישנים פעילים',
  'sys.some_sensors_stale': 'חיישנים מיושנים',
  'sys.sensors_offline':    'חיישנים לא מחוברים',
  'sys.just_now':           'ממש עכשיו',
  'sys.seconds_ago':        ({ count }) => `לפני ${count} שניות`,

  // KPI bar
  'kpi.tank_temp':      'טמפ׳ מיכל',
  'kpi.supply_temp':    'טמפ׳ אספקה',
  'kpi.return_temp':    'טמפ׳ חזרה',
  'kpi.flow_rate':      'קצב זרימה',
  'kpi.heat_pump':      'משאבת חום',
  'kpi.gas_backup':     'גיבוי גז',
  'kpi.recirc_pump':    'משאבת סירקולציה',
  'kpi.active_alarms':  'התראות פעילות',
  'kpi.no_value':       '—',
  'kpi.running':        'פועל',
  'kpi.standby':        'המתנה',

  // Alarm banner
  'alarm.critical_title': '⚠ מצב קריטי',
  'alarm.warning_title':  '⚠ אזהרת מערכת',
  'alarm.count_active':   ({ count }) =>
    count === 1 ? 'התראה קריטית אחת פעילה' : `${count} התראות פעילות`,
  'alarm.component_label': 'רכיב',

  // Equipment grid
  'equip.title':          'ציוד',
  'equip.no_sensor_data': 'אין נתוני חיישן',

  // Event timeline
  'timeline.title':         'אירועים אחרונים',
  'timeline.alarm_raised':  'התראה הופעלה',
  'timeline.alarm_pending': 'התראה בהמתנה',
  'timeline.alarm_cleared': 'התראה נסגרה',
  'timeline.session_start': 'סשן הדגמה החל',
  'timeline.no_events':     'אין אירועים אחרונים',

  // Equipment Detail Drawer (Stage 24)
  'drawer.title':              'פרטי ציוד',
  'drawer.close':              'סגור',
  'drawer.section_status':     'מצב',
  'drawer.section_telemetry':  'ערכים חיים',
  'drawer.section_alarms':     'התראות',
  'drawer.section_connections':'חיבורים',
  'drawer.equipment_type':     'סוג ציוד',
  'drawer.mode':               'מצב הפעלה',
  'drawer.mode_normal':        'רגיל',
  'drawer.mode_maintenance':   'תחזוקה',
  'drawer.mode_commissioning': 'הפעלה ראשונית',
  'drawer.no_live_data':       'אין נתונים חיים',
  'drawer.no_alarms':          'אין התראות פעילות',
  'drawer.no_connections':     'אין חיבורים',
  'drawer.provenance_measured':'מדידה ישירה',
  'drawer.provenance_inferred':'מחושב',
  'drawer.provenance_unknown': 'מקור לא ידוע',
  'drawer.demo_source':        'מצב הדגמה',
  'drawer.conn_in':            'כניסה',
  'drawer.conn_out':           'יציאה',

  // Stage 25: Demo Readiness
  'drawer.section_info':  'מידע מערכת',
  'demo.info_title':      'מצב הדגמה',
  'demo.info_body':       'ערכי טמפרטורה, זרימה ומצבי ציוד מסומלצים — אין חיבור לציוד אמיתי.',
  'demo.dismiss':         'הסתר',
  'demo.not_available':   'לא זמין בנתוני הדגמה',
};
