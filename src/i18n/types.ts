/**
 * Zentro Digital Twin — Localization Types
 *
 * Flat key-value translation system. Every user-facing string has a
 * TranslationKey. Components never hard-code display strings.
 */

export type Locale = 'he' | 'en';

/** All translation keys used in the application. */
export type TranslationKey =
  // App chrome
  | 'app.title'
  | 'app.all_clear'
  | 'app.alarms_count'
  | 'app.lang_switch'
  // HealthState labels
  | 'health.healthy'
  | 'health.warning'
  | 'health.critical'
  | 'health.offline'
  | 'health.maintenance'
  | 'health.commissioning'
  // NodeStatus labels
  | 'status.ok'
  | 'status.cold'
  | 'status.warn'
  | 'status.risk'
  | 'status.scald'
  | 'status.fault'
  | 'status.unknown'
  // SensorState labels
  | 'sensor.live'
  | 'sensor.stale'
  | 'sensor.lost'
  | 'sensor.unknown'
  // FlowState labels
  | 'flow.flowing'
  | 'flow.reverse'
  | 'flow.noflow'
  | 'flow.unknown'
  // PumpNode
  | 'pump.running'
  | 'pump.standby'
  | 'pump.no_data'
  | 'pump.flow_unit'
  // Units
  | 'unit.temperature'
  // Loading / empty states
  | 'flowmap.loading'
  | 'flowmap.empty'
  | 'dashboard.empty'
  // ── Stage 22: Mission Control ────────────────────────────────────────────
  // System status bar
  | 'sys.health'
  | 'sys.last_update'
  | 'sys.demo_mode'
  | 'sys.all_sensors_live'
  | 'sys.some_sensors_stale'
  | 'sys.sensors_offline'
  | 'sys.just_now'
  | 'sys.seconds_ago'
  | 'sys.minutes_ago'
  | 'sys.hours_ago'
  // KPI bar (8 cards)
  | 'kpi.tank_temp'
  | 'kpi.supply_temp'
  | 'kpi.return_temp'
  | 'kpi.flow_rate'
  | 'kpi.heat_pump'
  | 'kpi.gas_backup'
  | 'kpi.recirc_pump'
  | 'kpi.active_alarms'
  | 'kpi.no_value'
  | 'kpi.running'
  | 'kpi.standby'
  // Alarm banner
  | 'alarm.critical_title'
  | 'alarm.warning_title'
  | 'alarm.count_active'
  | 'alarm.component_label'
  // Equipment grid
  | 'equip.title'
  | 'equip.no_sensor_data'
  // Event timeline
  | 'timeline.title'
  | 'timeline.alarm_raised'
  | 'timeline.alarm_pending'
  | 'timeline.alarm_cleared'
  | 'timeline.session_start'
  | 'timeline.no_events'
  // ── Stage 24: Equipment Detail Drawer ────────────────────────────────────
  | 'drawer.title'
  | 'drawer.close'
  | 'drawer.section_status'
  | 'drawer.section_telemetry'
  | 'drawer.section_alarms'
  | 'drawer.section_connections'
  | 'drawer.equipment_type'
  | 'drawer.mode'
  | 'drawer.mode_normal'
  | 'drawer.mode_maintenance'
  | 'drawer.mode_commissioning'
  | 'drawer.no_live_data'
  | 'drawer.no_alarms'
  | 'drawer.no_connections'
  | 'drawer.provenance_measured'
  | 'drawer.provenance_inferred'
  | 'drawer.provenance_unknown'
  | 'drawer.demo_source'
  | 'drawer.conn_in'
  | 'drawer.conn_out'
  // ── Stage 25: Demo Readiness ─────────────────────────────────────────────
  | 'drawer.section_info'
  | 'demo.info_title'
  | 'demo.info_body'
  | 'demo.dismiss'
  | 'demo.not_available'
  // ── Stage 26: Presentation Mode ──────────────────────────────────────────
  | 'pres.enter'
  | 'pres.exit'
  | 'pres.badge'
  // ── Stage 29: Workspace Redesign ─────────────────────────────────────────
  | 'inspector.empty'
  // ── Stage 30: Builder LEGO UI ─────────────────────────────────────────────
  | 'builder.mode_build'
  | 'builder.mode_monitor'
  | 'builder.palette_title'
  | 'builder.placing_hint'
  | 'builder.cancel'
  | 'builder.props_title'
  | 'builder.name_label'
  | 'builder.rename_btn'
  | 'builder.delete_btn'
  | 'builder.delete_blocked'
  | 'builder.conn_title'
  | 'builder.conn_from'
  | 'builder.conn_from_port'
  | 'builder.conn_to'
  | 'builder.conn_to_port'
  | 'builder.conn_medium'
  | 'builder.conn_submit'
  | 'builder.conn_errors'
  | 'builder.conn_delete'
  | 'builder.idle_hint'
  // ── Stage 31: Node labels ─────────────────────────────────────────────────
  | 'valve.open'
  | 'valve.closed'
  // ── Stage 31: Builder / palette ───────────────────────────────────────────
  | 'builder.canvas_empty_title'
  | 'builder.canvas_empty_body'
  | 'builder.palette_search'
  | 'builder.palette_no_match'
  | 'builder.ports_section'
  | 'category.source'
  | 'category.storage'
  | 'category.pump'
  | 'category.valve'
  | 'category.sensor'
  | 'category.meter'
  | 'category.consumer'
  | 'category.zone'
  | 'category.air'
  // ── Stage 31: Inspector / equipment ───────────────────────────────────────
  | 'inspector.title'
  | 'equip.filter_placeholder'
  | 'equip.no_match'
  | 'builder.deselect_tip'
  // ── Stage 31: Alarm severity + pipe medium labels ─────────────────────────
  | 'alarm.severity_critical'
  | 'alarm.severity_warning'
  | 'alarm.severity_info'
  | 'medium.hot_water'
  | 'medium.cold_water'
  | 'medium.recirc'
  | 'medium.gas'
  | 'medium.electric'
  | 'medium.air'
  | 'medium.mixed';

/** String value or a function that interpolates { count: number }. */
export type TranslationValue = string | ((args: { count: number }) => string);

/** Full translation record — every key must be present. */
export type Translations = Record<TranslationKey, TranslationValue>;

/** Per-locale configuration (metadata separate from translations). */
export interface LocaleConfig {
  code:        Locale;
  name:        string;
  dir:         'rtl' | 'ltr';
  switchLabel: string;  // Label shown on the "switch language" button
  htmlLang:    string;  // BCP-47 tag for <html lang="…">
}
