/**
 * @demo-only DemoRuntimeSource — do not use in production.
 *
 * Builds the initial ZentroPayload from the hot-water seed fixture.
 * Exists only to give demo.tsx a RuntimeSource-typed entry point so the
 * callsite is symmetric with BackendRuntimeSource.
 */

import type { ComponentRegistry } from '../lib/component-registry.js';
import { buildHotWaterPayload, type ZentroPayload } from '../ingestion/fixture-adapter.js';
import type { RuntimeSource } from './runtime-source.js';

export class DemoRuntimeSource implements RuntimeSource {
  getInitialPayload(registry: ComponentRegistry): ZentroPayload {
    return buildHotWaterPayload(registry);
  }
}
