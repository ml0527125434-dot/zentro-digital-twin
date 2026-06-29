/**
 * Zentro Digital Twin — Persistence layer public API (Stage 35, P0-1)
 *
 * The Builder/app should import the PORT and adapters from here, never reach
 * into individual files. Swapping localStorage for a backend later means adding
 * one adapter and changing one factory call — nothing in the Builder changes.
 */

export {
  type ProjectSnapshot,
  type SnapshotSource,
  type SnapshotSink,
  CURRENT_SCHEMA_VERSION,
  SnapshotError,
  serializeProjectSnapshot,
  applyProjectSnapshot,
  parseProjectSnapshot,
  snapshotToJson,
  snapshotFromJson,
} from './project-snapshot.js';

export {
  type ProjectRepository,
  type ProjectSummary,
} from './project-repository.js';

export { createInMemoryProjectRepository } from './in-memory-repository.js';
export {
  createLocalStorageProjectRepository,
  isLocalStorageAvailable,
  peekLatestSnapshotSync,
  type StorageLike,
  type LocalStorageRepositoryOptions,
} from './local-storage-repository.js';

export { useAutosave } from './use-autosave.js';

export {
  snapshotSourceFromStores,
  snapshotSinkFromStores,
  captureSnapshot,
  restoreStoresFromSnapshot,
  type RestoredStores,
} from './store-binding.js';

export {
  PROJECT_FILE_EXTENSION,
  suggestFileName,
  downloadSnapshot,
  readSnapshotFromFile,
} from './project-file.js';
