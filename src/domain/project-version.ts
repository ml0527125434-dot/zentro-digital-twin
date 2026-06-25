/**
 * Zentro Digital Twin — Config Versioning (M10)
 *
 * Every CONFIG mutation increments the project version monotonically.
 * No mutation may be applied without producing a ProjectVersion record.
 * The Graph Engine (Stage 1B) is the only caller of VersionStore.increment().
 */

export type ConfigChangeKind =
  | 'project_created'
  | 'component_add'
  | 'component_update'
  | 'component_remove'
  | 'connection_add'
  | 'connection_update'
  | 'connection_remove'
  | 'profile_update';

export interface ProjectVersion {
  id:         string;
  projectId:  string;
  version:    number;       // monotonic; starts at 1
  createdAt:  string;       // ISO8601
  createdBy:  string;
  changeKind: ConfigChangeKind;
}

export interface VersionStore {
  /** Increment and record a new version. Returns the new ProjectVersion. */
  increment(
    projectId:  string,
    changeKind: ConfigChangeKind,
    createdBy:  string,
  ): ProjectVersion;

  /** Current version number for a project. Returns 0 if no versions exist yet. */
  current(projectId: string): number;

  /** Full ordered version history for a project. */
  history(projectId: string): ProjectVersion[];
}

export function createInMemoryVersionStore(): VersionStore {
  const store = new Map<string, ProjectVersion[]>();

  function getList(projectId: string): ProjectVersion[] {
    let list = store.get(projectId);
    if (!list) {
      list = [];
      store.set(projectId, list);
    }
    return list;
  }

  return {
    increment(projectId, changeKind, createdBy) {
      const list    = getList(projectId);
      const version = list.length + 1;
      const record: ProjectVersion = {
        id:         crypto.randomUUID(),
        projectId,
        version,
        createdAt:  new Date().toISOString(),
        createdBy,
        changeKind,
      };
      list.push(record);
      return record;
    },

    current(projectId) {
      return getList(projectId).length;
    },

    history(projectId) {
      return [...getList(projectId)];
    },
  };
}
