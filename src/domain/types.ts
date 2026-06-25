/**
 * Zentro Digital Twin — Domain & Type Contract v3
 *
 * Canonical shapes for the entire platform. Sourced from 03_DOMAIN_TYPE_CONTRACT.md.
 * No business logic lives here — only types, enums, and interfaces.
 *
 * Three planes (architectural law):
 *   CONFIG    — Component Graph. Read/write, bidirectional. Versioned.
 *   TELEMETRY — Live Store. One-way: physical world → store → views.
 *   COMMAND   — Command Service. Views initiate only; backend executes.
 *
 * Three orthogonal status axes (never merged):
 *   SensorState      — freshness of the data
 *   HealthState      — condition/lifecycle of the component
 *   NodeStatus       — value vs. its Operational Profile
 */

// ---------------------------------------------------------------------------
// Axis 1 — data freshness
// ---------------------------------------------------------------------------

export enum SensorState {
  Live    = 'live',
  Stale   = 'stale',
  Lost    = 'lost',
  Unknown = 'unknown',
}

export enum ValueProvenance {
  Measured = 'measured',
  Inferred = 'inferred',
  Unknown  = 'unknown',
}

// ---------------------------------------------------------------------------
// Axis 2 — component health/lifecycle
// Maintenance and Commissioning are MODES that suppress alarms and gate commands.
// ---------------------------------------------------------------------------

export enum HealthState {
  Healthy       = 'healthy',
  Warning       = 'warning',
  Critical      = 'critical',
  Offline       = 'offline',
  Maintenance   = 'maintenance',
  Commissioning = 'commissioning',
}

// ---------------------------------------------------------------------------
// Axis 3 — operational status (emitted by profile; theme maps to colour)
// ---------------------------------------------------------------------------

export enum NodeStatus {
  Ok      = 'ok',
  Cold    = 'cold',
  Warn    = 'warn',
  Risk    = 'risk',
  Scald   = 'scald',
  Fault   = 'fault',
  Unknown = 'unknown',
}

// ---------------------------------------------------------------------------
// Flow (derived from telemetry; Unknown when governing sensor !== Live)
// ---------------------------------------------------------------------------

export enum FlowState {
  Flowing = 'flowing',
  NoFlow  = 'no_flow',
  Reverse = 'reverse',
  Unknown = 'unknown',
}

// ---------------------------------------------------------------------------
// Command lifecycle
// Timeout is NOT Failed — outcome is indeterminate. Never auto-retry.
// ---------------------------------------------------------------------------

export enum CommandState {
  Idle            = 'idle',
  Requested       = 'requested',
  Queued          = 'queued',
  Accepted        = 'accepted',
  Executing       = 'executing',
  WaitingFeedback = 'waiting_feedback',
  Completed       = 'completed',
  Failed          = 'failed',
  Timeout         = 'timeout',
  Cancelled       = 'cancelled',
}

// ---------------------------------------------------------------------------
// Shared scalar types
// ---------------------------------------------------------------------------

export type BindingSource = 'mqtt' | 'modbus' | 'knx' | 'dry_contact' | 'api';

export type Medium =
  | 'hot_water'
  | 'cold_water'
  | 'recirc'
  | 'gas'
  | 'air'
  | 'electric'
  | 'mixed';

export type ProfileMetric =
  | 'temperature'
  | 'pressure'
  | 'flow'
  | 'humidity'
  | 'co2'
  | 'runtime'
  | 'diff_pressure'
  | 'energy';

// ---------------------------------------------------------------------------
// Bindings — CONFIG. Owned by either a Component or a Connection.
// ---------------------------------------------------------------------------

export interface Binding {
  id:         string;
  source:     BindingSource;
  address:    string;
  metric:     ProfileMetric;
  unit?:      string;
  ttlSeconds: number;          // freshness window → drives SensorState
}

// ---------------------------------------------------------------------------
// Live Sample — TELEMETRY. Never persisted into config tables.
// liveStore is a Map<bindingId, LiveSample>.
// ---------------------------------------------------------------------------

export interface LiveSample {
  bindingId:   string;
  value:       number | boolean | null;
  ts:          string;              // ISO8601
  state:       SensorState;
  provenance:  ValueProvenance;
  confidence?: number;              // 0..1; populate ONLY with a real model basis
}

// ---------------------------------------------------------------------------
// Operational Profile
// Profile → NodeStatus. Theme maps NodeStatus → { colour, icon, label }.
// Effective profile = Project override ← Instance override ← Type default.
// ---------------------------------------------------------------------------

export interface ProfileBand {
  status: NodeStatus;
  min?:   number;     // inclusive; omitted = -Infinity
  max?:   number;     // exclusive; omitted = +Infinity
}

export interface MetricBands {
  metric:      ProfileMetric;
  unit?:       string;
  hysteresis?: number;       // dead-band to prevent status flapping
  bands:       ProfileBand[]; // evaluated top-to-bottom; first match wins
}

export interface OperationalProfile {
  id:            string;
  appliesToType: string;
  scope:         'type_default' | 'instance' | 'project';
  metrics:       MetricBands[];
}

// ---------------------------------------------------------------------------
// Rules (stub — v1; evaluated SERVER-SIDE by Rules Engine / Command Service)
// ---------------------------------------------------------------------------

export interface RuleDef {
  id:        string;
  scope:     'component' | 'connection' | 'project';
  condition: string;    // expression evaluated by the backend
  actions:   string[];  // e.g. 'raise_alarm' | 'set_health' | 'block_command'
}

// ---------------------------------------------------------------------------
// Components — CONFIG. Instances of a ComponentDefinition (see Component SDK).
// ---------------------------------------------------------------------------

export interface ActionDef {
  id:        string;
  label:     string;
  dangerous: boolean;
}

export interface Component {
  id:                   string;
  type:                 string;
  name:                 string;
  projectId:            string;
  position?:            { x: number; y: number };
  layoutHint?:          Record<string, unknown>; // forward-compat: pluggable layout
  bindings:             Binding[];
  operationalProfileId?: string;
  mode?:                'normal' | 'maintenance' | 'commissioning';
  allowedActions?:      ActionDef[];
}

// ---------------------------------------------------------------------------
// Connections — CONFIG
// fromPortId / toPortId validated against the source/target ComponentDefinition ports.
// bindings[] holds segment sensors (e.g. supply/return pipe temp).
// ---------------------------------------------------------------------------

export interface Connection {
  id:                    string;
  projectId:             string;
  fromComponentId:       string;
  fromPortId:            string;
  toComponentId:         string;
  toPortId:              string;
  medium:                Medium;
  topologicalDirection:  'forward' | 'bidirectional';
  bindings?:             Binding[];    // segment sensors
  valueBindingId?:       string;       // references a binding in THIS connection's bindings[]
  inferFromComponentId?: string;
  operationalProfileId?: string;
}

// ---------------------------------------------------------------------------
// Alarms
// State machine:
//   pending --(debounce elapsed)--> active --> acknowledged --> cleared
//   pending --(cleared before debounce)--> dismissed
// Suppressed when component is in maintenance / commissioning.
// ---------------------------------------------------------------------------

export interface AlarmRule {
  id:              string;
  componentId:     string;
  triggerStatus:   NodeStatus[];
  debounceSeconds: number;
  severity:        'info' | 'warning' | 'critical';
  message:         string;
}

export interface Alarm {
  id:          string;
  ruleId:      string;
  componentId: string;
  raisedAt:    string;
  clearedAt?:  string;
  ackBy?:      string;
  ackAt?:      string;
  state:       'pending' | 'active' | 'acknowledged' | 'cleared' | 'dismissed';
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export interface CommandRequest {
  id:           string;
  componentId:  string;
  actionId:     string;
  requestedBy:  string;
  requestedAt:  string;
  state:        CommandState;
  checks?:      { rbacOk: boolean; freshnessOk: boolean; interlocksOk: boolean };
  confirmedBy?: string;
  result?:      'completed' | 'failed' | 'timeout' | 'cancelled';
  reason?:      string;
}

// ---------------------------------------------------------------------------
// Event Log — append-only from day one (Constitution Art. 13)
// ---------------------------------------------------------------------------

export type EventKind =
  | 'command'
  | 'alarm'
  | 'health_change'
  | 'status_change'
  | 'maintenance'
  | 'note';

export interface DomainEventLog {
  id:          string;
  componentId: string;
  ts:          string;
  kind:        EventKind;
  severity?:   'info' | 'warning' | 'critical';
  message:     string;
  data?:       Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Projections — the hot path. Defined here as types only.
// projectComponent() and projectConnection() are implemented in Stage 4.
// liveValues key = SensorSlot.id from the ComponentDefinition.
// ---------------------------------------------------------------------------

export interface ActiveCommand {
  actionId:  string;
  state:     CommandState;
  requestId: string;
}

export interface ComponentViewModel {
  componentId:       string;
  health:            HealthState;   // axis 2
  operationalStatus: NodeStatus;    // axis 3 (primary metric vs. profile)
  sensorState:       SensorState;   // axis 1 (governing binding freshness)
  provenance:        ValueProvenance;
  confidence?:       number;
  liveValues:        Record<string, number | boolean | null>; // key = SensorSlot.id
  activeCommands:    ActiveCommand[];
  activeAlarms:      string[];
}

export interface ConnectionViewModel {
  connectionId: string;
  flow:         FlowState;     // Unknown if governing sensor !== Live
  value:        number | null;
  unit?:        string;
  status:       NodeStatus;
  sensorState:  SensorState;
  provenance:   ValueProvenance;
}

// ---------------------------------------------------------------------------
// System Model
// ---------------------------------------------------------------------------

export interface Project {
  id:       string;
  name:     string;
  siteType: string;
}

export interface SystemModel {
  project:            Project;
  operationalProfiles: OperationalProfile[];
  components:         Component[];
  connections:        Connection[];
  alarmRules:         AlarmRule[];
}
