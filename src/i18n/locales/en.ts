import type { LocaleConfig, Translations } from '../types.js';

export const EN_CONFIG: LocaleConfig = {
  code:        'en',
  name:        'English',
  dir:         'ltr',
  switchLabel: 'עב',
  htmlLang:    'en',
};

export const EN: Translations = {
  // App chrome
  'app.title':        'Zentro Digital Twin',
  'app.all_clear':    '✓ All clear',
  'app.alarms_count': ({ count }) =>
    count === 1 ? '1 alarm' : `${count} alarms`,
  'app.lang_switch':  'עב',

  // HealthState
  'health.healthy':       'Healthy',
  'health.warning':       'Warning',
  'health.critical':      'Critical',
  'health.offline':       'Offline',
  'health.maintenance':   'Maintenance',
  'health.commissioning': 'Commissioning',

  // NodeStatus
  'status.ok':      'OK',
  'status.cold':    'Cold',
  'status.warn':    'Warn',
  'status.risk':    'Risk',
  'status.scald':   'Scald',
  'status.fault':   'Fault',
  'status.unknown': 'Unknown',

  // SensorState
  'sensor.live':    'Live',
  'sensor.stale':   'Stale',
  'sensor.lost':    'Lost',
  'sensor.unknown': 'Unknown',

  // FlowState
  'flow.flowing': 'Flowing',
  'flow.reverse': 'Reverse',
  'flow.noflow':  'No flow',
  'flow.unknown': 'Unknown',

  // PumpNode
  'pump.running':   '▶ Running',
  'pump.standby':   '◼ Standby',
  'pump.no_data':   '? No data',
  'pump.flow_unit': 'L/m',

  // Units
  'unit.temperature': '°C',

  // Loading / empty states
  'flowmap.loading': 'Computing layout…',
  'flowmap.empty':   'No components to display',
  'dashboard.empty': 'No components',

  // ── Stage 22: Mission Control ─────────────────────────────────────────────

  // System status bar
  'sys.health':             'System Health',
  'sys.last_update':        'Last update',
  'sys.demo_mode':          'Demo mode',
  'sys.all_sensors_live':   'All sensors live',
  'sys.some_sensors_stale': 'Some sensors stale',
  'sys.sensors_offline':    'Sensors offline',
  'sys.just_now':           'Just now',
  'sys.seconds_ago':        ({ count }) => `${count}s ago`,
  'sys.minutes_ago':        ({ count }) => `${count}m ago`,
  'sys.hours_ago':          ({ count }) => `${count}h ago`,

  // KPI bar
  'kpi.tank_temp':      'Tank Temp',
  'kpi.supply_temp':    'Supply Temp',
  'kpi.return_temp':    'Return Temp',
  'kpi.flow_rate':      'Flow Rate',
  'kpi.heat_pump':      'Heat Pump',
  'kpi.gas_backup':     'Gas Backup',
  'kpi.recirc_pump':    'Recirc Pump',
  'kpi.active_alarms':  'Active Alarms',
  'kpi.no_value':       '—',
  'kpi.running':        'Running',
  'kpi.standby':        'Standby',

  // Alarm banner
  'alarm.critical_title': '⚠ Critical Alert',
  'alarm.warning_title':  '⚠ System Warning',
  'alarm.count_active':   ({ count }) =>
    count === 1 ? '1 active alarm' : `${count} active alarms`,
  'alarm.component_label': 'Component',

  // Equipment grid
  'equip.title':          'Equipment',
  'equip.no_sensor_data': 'No sensor data',

  // Event timeline
  'timeline.title':         'Recent Events',
  'timeline.alarm_raised':  'Alarm raised',
  'timeline.alarm_pending': 'Alarm pending',
  'timeline.alarm_cleared': 'Alarm cleared',
  'timeline.session_start': 'Demo session started',
  'timeline.no_events':     'No recent events',

  // Equipment Detail Drawer (Stage 24)
  'drawer.title':              'Equipment Details',
  'drawer.close':              'Close',
  'drawer.section_status':     'Status',
  'drawer.section_telemetry':  'Live Values',
  'drawer.section_alarms':     'Alarms',
  'drawer.section_connections':'Connections',
  'drawer.equipment_type':     'Equipment Type',
  'drawer.mode':               'Operating Mode',
  'drawer.mode_normal':        'Normal',
  'drawer.mode_maintenance':   'Maintenance',
  'drawer.mode_commissioning': 'Commissioning',
  'drawer.no_live_data':       'No live data',
  'drawer.no_alarms':          'No active alarms',
  'drawer.no_connections':     'No connections',
  'drawer.provenance_measured':'Direct measurement',
  'drawer.provenance_inferred':'Inferred',
  'drawer.provenance_unknown': 'Unknown source',
  'drawer.demo_source':        'Demo mode',
  'drawer.conn_in':            'From',
  'drawer.conn_out':           'To',

  // Stage 25: Demo Readiness
  'drawer.section_info':  'System Information',
  'demo.info_title':      'Demo Mode',
  'demo.info_body':       'Temperature, flow, and equipment states are simulated — no real equipment is connected.',
  'demo.dismiss':         'Dismiss',
  'demo.not_available':   'Not available in demo data',

  // Stage 26: Presentation Mode
  'pres.enter': 'Present',
  'pres.exit':  'Exit',
  'pres.badge': 'PRESENT',

  // Stage 29: Workspace Redesign
  'inspector.empty': 'Select a component to inspect',

  // Stage 30: Builder LEGO UI
  'builder.mode_build':    'Build',
  'builder.mode_monitor':  'Monitor',
  'builder.palette_title': 'Components',
  'builder.placing_hint':  'Click canvas to place',
  'builder.cancel':        'Cancel',
  'builder.props_title':   'Properties',
  'builder.name_label':    'Name',
  'builder.rename_btn':    'Rename',
  'builder.delete_btn':    'Delete',
  'builder.delete_blocked':'Cannot delete: disconnect first',
  'builder.conn_title':    'Add Connection',
  'builder.conn_from':     'From',
  'builder.conn_from_port':'From port',
  'builder.conn_to':       'To',
  'builder.conn_to_port':  'To port',
  'builder.conn_medium':   'Medium',
  'builder.conn_submit':   'Connect',
  'builder.conn_errors':   'Validation errors',
  'builder.conn_delete':   'Delete connection',
  'builder.idle_hint':     'Select a component or connection',

  // Stage 31: Node labels
  'valve.open':   'Open',
  'valve.closed': 'Closed',

  // Stage 31: Builder / palette
  'builder.canvas_empty_title': 'Start building your system',
  'builder.canvas_empty_body':  'Pick a component from the palette and click to place it',
  'builder.palette_search':     'Search components…',
  'builder.palette_no_match':   'No match',
  'builder.ports_section':      'Ports',
  'category.source':   'Heat Sources',
  'category.storage':  'Storage',
  'category.pump':     'Pumps',
  'category.valve':    'Valves',
  'category.sensor':   'Sensors',
  'category.meter':    'Meters',
  'category.consumer': 'Consumers',
  'category.zone':     'Distribution',
  'category.air':      'Auxiliary',

  // Stage 31: Inspector / equipment
  'inspector.title':           'Inspector',
  'equip.filter_placeholder':  'Filter…',
  'equip.no_match':            'No match',
  'builder.deselect_tip':      'Tip: press Del or Esc to deselect',
};
