/**
 * Zentro Digital Twin — ZentroPayload Validator (Stage 27)
 *
 * Validates an unknown value as a well-formed ZentroPayload before ingestion.
 * Used at the backend adapter boundary to catch malformed responses early.
 *
 * validatePayload()   — returns ValidationError[] (empty = valid)
 * assertValidPayload() — throws with all error paths if validation fails
 */

import type { ZentroPayload } from './fixture-adapter.js';

export interface ValidationError {
  path:    string;
  message: string;
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && (v as string).length > 0;
}

export function validatePayload(payload: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isObj(payload)) {
    errors.push({ path: '', message: 'payload must be a non-null object' });
    return errors;
  }

  // graph
  if (!isObj(payload['graph'])) {
    errors.push({ path: 'graph', message: 'must be an object' });
  } else {
    const graph = payload['graph'] as Obj;

    if (!isObj(graph['project'])) {
      errors.push({ path: 'graph.project', message: 'must be an object' });
    } else {
      const proj = graph['project'] as Obj;
      if (!isStr(proj['id']))   errors.push({ path: 'graph.project.id',   message: 'must be a non-empty string' });
      if (!isStr(proj['name'])) errors.push({ path: 'graph.project.name', message: 'must be a non-empty string' });
    }

    if (!Array.isArray(graph['components'])) {
      errors.push({ path: 'graph.components', message: 'must be an array' });
    } else {
      (graph['components'] as unknown[]).forEach((c, i) => {
        if (!isObj(c)) { errors.push({ path: `graph.components[${i}]`, message: 'must be an object' }); return; }
        const cObj = c as Obj;
        if (!isStr(cObj['id']))        errors.push({ path: `graph.components[${i}].id`,        message: 'must be a non-empty string' });
        if (!isStr(cObj['type']))      errors.push({ path: `graph.components[${i}].type`,      message: 'must be a non-empty string' });
        if (!isStr(cObj['projectId'])) errors.push({ path: `graph.components[${i}].projectId`, message: 'must be a non-empty string' });
      });
    }

    if (!Array.isArray(graph['connections'])) {
      errors.push({ path: 'graph.connections', message: 'must be an array' });
    }
  }

  // profiles
  if (!isObj(payload['profiles'])) {
    errors.push({ path: 'profiles', message: 'must be an object' });
  } else if (!Array.isArray((payload['profiles'] as Obj)['profiles'])) {
    errors.push({ path: 'profiles.profiles', message: 'must be an array' });
  }

  // alarmRules
  if (!isObj(payload['alarmRules'])) {
    errors.push({ path: 'alarmRules', message: 'must be an object' });
  } else if (!Array.isArray((payload['alarmRules'] as Obj)['rules'])) {
    errors.push({ path: 'alarmRules.rules', message: 'must be an array' });
  } else {
    ((payload['alarmRules'] as Obj)['rules'] as unknown[]).forEach((r, i) => {
      if (!isObj(r)) { errors.push({ path: `alarmRules.rules[${i}]`, message: 'must be an object' }); return; }
      const rObj = r as Obj;
      if (!isStr(rObj['id']))          errors.push({ path: `alarmRules.rules[${i}].id`,          message: 'must be a non-empty string' });
      if (!isStr(rObj['componentId'])) errors.push({ path: `alarmRules.rules[${i}].componentId`, message: 'must be a non-empty string' });
    });
  }

  // samples — optional; if present must be array
  if ('samples' in payload && payload['samples'] !== undefined && !Array.isArray(payload['samples'])) {
    errors.push({ path: 'samples', message: 'if present, must be an array' });
  }

  return errors;
}

export function assertValidPayload(payload: unknown): asserts payload is ZentroPayload {
  const errors = validatePayload(payload);
  if (errors.length > 0) {
    throw new Error(
      `Invalid ZentroPayload:\n${errors.map(e => `  ${e.path}: ${e.message}`).join('\n')}`,
    );
  }
}
