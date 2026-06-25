/**
 * BackendRuntimeSource — integration seam for the Zentro backend (Stage 27).
 *
 * The caller fetches the payload from the backend HTTP API, validates it with
 * assertValidPayload(), then wraps it here. bootstrapApp() receives the result
 * of getInitialPayload().
 *
 * Typical integration entry point:
 *
 *   import { assertValidPayload } from '../ingestion/payload-validator.js';
 *   import { BackendRuntimeSource } from '../runtime/backend-runtime-source.js';
 *   import { bootstrapApp } from './bootstrap.js';
 *
 *   const raw = await fetch('/api/zentro/v1/payload').then(r => r.json());
 *   assertValidPayload(raw);                          // throws on bad payload
 *   const source = new BackendRuntimeSource(raw);
 *   const ctx    = bootstrapApp(source.getInitialPayload(registry), registry);
 *
 * Live telemetry (post-bootstrap):
 *   Open a WebSocket to the backend. Per incoming LiveSample frame:
 *     ingestSample(frame, ctx.liveStore);
 *   See docs/BACKEND_INTEGRATION.md §Live Telemetry.
 *
 * Architecture constraint:
 *   The frontend must NEVER connect directly to MQTT, Modbus, KNX, PLCs,
 *   controllers, or field devices. All real data must arrive only through
 *   the Zentro backend ingestion contract.
 */

import type { ComponentRegistry } from '../lib/component-registry.js';
import type { ZentroPayload } from '../ingestion/fixture-adapter.js';
import type { RuntimeSource } from './runtime-source.js';

export class BackendRuntimeSource implements RuntimeSource {
  constructor(private readonly payload: ZentroPayload) {}

  getInitialPayload(_registry: ComponentRegistry): ZentroPayload {
    return this.payload;
  }
}
