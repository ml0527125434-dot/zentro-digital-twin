/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocaleProvider } from '../../i18n/index.js';
import { PersistenceToolbar } from './PersistenceToolbar.js';
import {
  DOCUMENT_KIND,
  CURRENT_SCHEMA_VERSION,
  type ProjectSnapshot,
  type ProjectRepository,
} from '../../persistence/index.js';

function makeSnapshot(): ProjectSnapshot {
  return {
    kind: DOCUMENT_KIND,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: '2026-06-29T00:00:00.000Z',
    project: { id: 'p1', name: 'בדיקה', siteType: 'residential' },
    operationalProfiles: [],
    components: [],
    connections: [],
    alarmRules: [],
  };
}

function fileLike(text: string): File {
  return { text: async () => text } as unknown as File;
}

function fakeRepo(): ProjectRepository & { saved: ProjectSnapshot[] } {
  const saved: ProjectSnapshot[] = [];
  return {
    saved,
    async save(s) { saved.push(s); },
    async load() { return null; },
    async loadLatest() { return null; },
    async remove() {},
    async list() { return []; },
  };
}

function renderToolbar(props: Partial<React.ComponentProps<typeof PersistenceToolbar>> = {}) {
  const repo = props.repo ?? fakeRepo();
  const capture = props.capture ?? (() => makeSnapshot());
  return {
    repo: repo as ReturnType<typeof fakeRepo>,
    ...render(
      <LocaleProvider>
        <PersistenceToolbar repo={repo} capture={capture} onAfterImport={props.onAfterImport} />
      </LocaleProvider>,
    ),
  };
}

beforeEach(() => {
  // Stub object URL APIs used by the export download path.
  (globalThis.URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:x';
  (globalThis.URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
});

describe('PersistenceToolbar', () => {
  it('renders the three Hebrew controls', () => {
    renderToolbar();
    expect(screen.getByTestId('persist-save-btn').textContent).toBe('שמור');
    expect(screen.getByTestId('persist-export-btn').textContent).toBe('ייצוא');
    expect(screen.getByTestId('persist-import-btn').textContent).toBe('ייבוא');
  });

  it('Save calls repo.save and shows "נשמר"', async () => {
    const { repo } = renderToolbar();
    fireEvent.click(screen.getByTestId('persist-save-btn'));
    const fb = await screen.findByTestId('persist-feedback');
    expect(fb.textContent).toBe('נשמר');
    expect(repo.saved).toHaveLength(1);
  });

  it('Export shows "ייצוא הושלם"', async () => {
    renderToolbar();
    fireEvent.click(screen.getByTestId('persist-export-btn'));
    const fb = await screen.findByTestId('persist-feedback');
    expect(fb.textContent).toBe('ייצוא הושלם');
  });

  it('Import of a valid file saves it, shows "ייבוא הושלם" and triggers the after-import hook', async () => {
    const onAfterImport = vi.fn();
    const { repo } = renderToolbar({ onAfterImport });
    const file = fileLike(JSON.stringify(makeSnapshot()));
    fireEvent.change(screen.getByTestId('persist-import-input'), { target: { files: [file] } });

    const fb = await screen.findByTestId('persist-feedback');
    expect(fb.textContent).toBe('ייבוא הושלם');
    expect(repo.saved).toHaveLength(1);
    await waitFor(() => expect(onAfterImport).toHaveBeenCalledTimes(1));
  });

  it('Import of an invalid file shows "שגיאת ייבוא" and does not save', async () => {
    const onAfterImport = vi.fn();
    const { repo } = renderToolbar({ onAfterImport });
    const file = fileLike('{ not a zentro doc');
    fireEvent.change(screen.getByTestId('persist-import-input'), { target: { files: [file] } });

    const fb = await screen.findByTestId('persist-feedback');
    expect(fb.textContent).toBe('שגיאת ייבוא');
    expect(repo.saved).toHaveLength(0);
    expect(onAfterImport).not.toHaveBeenCalled();
  });

  it('Import of a wrong-kind file is rejected', async () => {
    const { repo } = renderToolbar();
    const wrong = { ...makeSnapshot(), kind: 'something.else' };
    const file = fileLike(JSON.stringify(wrong));
    fireEvent.change(screen.getByTestId('persist-import-input'), { target: { files: [file] } });

    const fb = await screen.findByTestId('persist-feedback');
    expect(fb.textContent).toBe('שגיאת ייבוא');
    expect(repo.saved).toHaveLength(0);
  });
});
