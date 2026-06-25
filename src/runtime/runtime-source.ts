/**
 * Zentro Digital Twin — RuntimeSource interface (Stage 27)
 *
 * Abstracts the origin of the initial ZentroPayload.
 *
 * DemoRuntimeSource   — builds from the hot-water seed fixture (demo/dev only)
 * BackendRuntimeSource — wraps a payload fetched from the Zentro backend API
 *
 * Callers:
 *   const payload = source.getInitialPayload(registry);
 *   const ctx     = bootstrapApp(payload, registry);
 *
 * Live telemetry (post-bootstrap) is NOT part of this interface.
 * The backend delivers LiveSample objects; the integration layer calls
 * ingestSample(sample, ctx.liveStore) per frame.
 * See docs/BACKEND_INTEGRATION.md §Live Telemetry.
 */

import type { ComponentRegistry } from '../lib/component-registry.js';
import type { ZentroPayload } from '../ingestion/fixture-adapter.js';

export interface RuntimeSource {
  /**
   * Returns the initial ZentroPayload for bootstrap.
   * Called once at startup before bootstrapApp().
   */
  getInitialPayload(registry: ComponentRegistry): ZentroPayload;
}
