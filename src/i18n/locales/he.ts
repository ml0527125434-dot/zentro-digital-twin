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
  'sys.minutes_ago':        ({ count }) => `לפני ${count} דקות`,
  'sys.hours_ago':          ({ count }) => `לפני ${count} שעות`,

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

  // Stage 26: Presentation Mode
  'pres.enter': 'הצגה מלאה',
  'pres.exit':  'יציאה',
  'pres.badge': 'מצג',

  // Stage 29: Workspace Redesign
  'inspector.empty': 'בחר רכיב לפרטים',

  // Stage 30: Builder LEGO UI
  'builder.mode_build':    'בנייה',
  'builder.mode_monitor':  'ניטור',
  'builder.palette_title': 'רכיבים',
  'builder.placing_hint':  'לחץ על הבד להנחה',
  'builder.cancel':        'בטל',
  'builder.props_title':   'מאפיינים',
  'builder.name_label':    'שם',
  'builder.rename_btn':    'שנה שם',
  'builder.duplicate':     'שכפל',
  'builder.delete_btn':    'מחק',
  'builder.delete_blocked':'לא ניתן למחוק: נתק תחילה',
  'builder.conn_title':    'הוסף חיבור',
  'builder.conn_from':     'ממרכיב',
  'builder.conn_from_port':'מיציאה',
  'builder.conn_to':       'לרכיב',
  'builder.conn_to_port':  'לכניסה',
  'builder.conn_medium':   'מדיום',
  'builder.conn_submit':   'חבר',
  'builder.conn_errors':   'שגיאות',
  'builder.conn_delete':   'מחק חיבור',
  'builder.idle_hint':     'בחר רכיב או חיבור',

  // Stage 31: Node labels
  'valve.open':   'פתוח',
  'valve.closed': 'סגור',

  // Stage 31: Builder / palette
  'builder.canvas_empty_title': 'התחל לבנות את המערכת',
  'builder.canvas_empty_body':  'גרור רכיב מהספרייה אל הבד, או לחץ ואז לחץ על הבד',
  'builder.palette_search':     'חפש רכיבים…',
  'builder.palette_no_match':   'אין תוצאות',
  'builder.lego_title':         'ספריית רכיבים',
  'builder.lego_hint':          'גרור לבד • לחץ לבחירה',
  'builder.lego_drag_tip':      '⬡ גרור רכיב ישירות אל הבד',
  'builder.lego_active_hint':   'לחץ על הבד להנחה — או גרור לשם',
  'builder.ports_section':      'פורטים',
  'category.source':   'מקורות חום',
  'category.storage':  'אגירה',
  'category.pump':     'משאבות',
  'category.valve':    'שסתומים',
  'category.sensor':   'חיישנים',
  'category.meter':    'מדים',
  'category.consumer': 'נקודות צריכה',
  'category.zone':     'הפצה',
  'category.air':      'עזר',

  // Stage 31: Inspector / equipment
  'inspector.title':           'מפקח',
  'equip.filter_placeholder':  'סינון…',
  'equip.no_match':            'אין תוצאות',
  'builder.deselect_tip':      'טיפ: לחץ Del או Esc לביטול הבחירה',

  // Stage 31: Alarm severity labels
  'alarm.severity_critical': 'קריטי',
  'alarm.severity_warning':  'אזהרה',
  'alarm.severity_info':     'מידע',

  // Stage 31: Pipe medium labels
  'medium.hot_water':  'מים חמים',
  'medium.cold_water': 'מים קרים',
  'medium.recirc':     'רה-סירקולציה',
  'medium.gas':        'גז',
  'medium.electric':   'חשמל',
  'medium.air':        'אוויר',
  'medium.mixed':      'מעורב',

  // Stage 31: Alarm rule messages
  'alarm.rule.tank_risk':     'טמפרטורת מיכל מתחת לסף הבטיחות — סכנת לגיונלה',
  'alarm.rule.tank_warn':     'טמפרטורת מיכל באזור אזהרה',
  'alarm.rule.shower_scald':  'טמפרטורת מקלחת מעל הגבול הבטוח — סכנת כוויה',
  'alarm.rule.shower_cold':   'טמפרטורת מקלחת מתחת לסף הנוחות',

  // Stage 35: Persistence toolbar
  'builder.persist_save':         'שמור',
  'builder.persist_export':       'ייצוא',
  'builder.persist_import':       'ייבוא',
  'builder.persist_saved':        'נשמר',
  'builder.persist_exported':     'ייצוא הושלם',
  'builder.persist_imported':     'ייבוא הושלם',
  'builder.persist_import_error': 'שגיאת ייבוא',
  'builder.history_undone':       'בוטל',
  'builder.history_redone':       'שוחזר',
  'builder.copied':               'הועתק',
  'builder.shortcuts_hint':       'גרור מפורט לפורט כדי לחבר · גרירה על הבד = בחירה · Delete מחיקה · Ctrl+Z ביטול · Ctrl+D שכפול · Ctrl+A בחר הכל',
  'builder.shortcuts_dismiss':    'הבנתי',

  // Stage 2A: Workspace status / validation bar
  'status.ready':           'מוכן',
  'status.no_components':   'אין ציוד',
  'status.design_warnings': ({ count }) => count === 1 ? 'אזהרת תכן אחת' : `${count} אזהרות תכן`,
  'status.selected':        ({ count }) => `${count} נבחרו`,
  'status.components':      ({ count }) => count === 1 ? 'רכיב אחד' : `${count} רכיבים`,
  'status.connections':     ({ count }) => count === 1 ? 'צינור אחד' : `${count} צינורות`,

  // Stage 2B: Top toolbar
  'toolbar.group_file':   'קובץ',
  'toolbar.group_edit':   'עריכה',
  'toolbar.group_layout': 'פריסה',
  'toolbar.group_view':   'תצוגה',
  'toolbar.undo':         'ביטול',
  'toolbar.redo':         'חזרה',
  'toolbar.duplicate':    'שכפול',
  'toolbar.delete':       'מחיקה',
  'toolbar.fit':          'התאם',
  'toolbar.auto_arrange': 'סדר אוטומטית',
  'toolbar.grid':         'רשת',
  'toolbar.search':       'חיפוש',
};
