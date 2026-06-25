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
  | 'dashboard.empty';

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
