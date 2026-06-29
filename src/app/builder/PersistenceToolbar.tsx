/**
 * Zentro Digital Twin — Persistence Toolbar (Stage 35, P0-1c)
 *
 * Build-mode controls that surface the EXISTING persistence functions:
 *   - שמור   → manual save through the ProjectRepository port
 *   - ייצוא  → export the current model to a .zentro.json file
 *   - ייבוא  → import a .zentro.json file (validated), persist it, reload
 *
 * This component adds NO new persistence behaviour and knows nothing about the
 * concrete backend — it only calls the port and the file helpers. Autosave
 * continues to run independently.
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useLocale } from '../../i18n/index.js';
import type { TranslationKey } from '../../i18n/index.js';
import {
  downloadSnapshot,
  readSnapshotFromFile,
  type ProjectRepository,
  type ProjectSnapshot,
} from '../../persistence/index.js';

export interface PersistenceToolbarProps {
  repo?: ProjectRepository;
  capture: () => ProjectSnapshot;
  /** Test seam: replaces the post-import page reload. */
  onAfterImport?: () => void;
}

type Feedback = { tone: 'ok' | 'error'; key: TranslationKey } | null;

const btnStyle: React.CSSProperties = {
  background: 'var(--bg-mantle)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-base)',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
  padding: '3px 9px',
  lineHeight: 1.4,
};

export function PersistenceToolbar({ repo, capture, onAfterImport }: PersistenceToolbarProps) {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const flash = useCallback((tone: 'ok' | 'error', key: TranslationKey) => {
    setFeedback({ tone, key });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(null), 2500);
  }, []);

  const handleSave = useCallback(async () => {
    if (!repo) return;
    try {
      await Promise.resolve(repo.save(capture()));
      flash('ok', 'builder.persist_saved');
    } catch {
      flash('error', 'builder.persist_import_error');
    }
  }, [repo, capture, flash]);

  const handleExport = useCallback(() => {
    try {
      downloadSnapshot(capture());
      flash('ok', 'builder.persist_exported');
    } catch {
      flash('error', 'builder.persist_import_error');
    }
  }, [capture, flash]);

  const handleImportClick = useCallback(() => fileRef.current?.click(), []);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // allow re-picking the same file later
      if (!file) return;
      try {
        const snapshot = await readSnapshotFromFile(file); // validates kind + shape
        if (repo) await Promise.resolve(repo.save(snapshot));
        flash('ok', 'builder.persist_imported');
        const reload =
          onAfterImport ??
          (() => {
            try {
              globalThis.location?.reload();
            } catch {
              /* no-op outside a browser */
            }
          });
        setTimeout(reload, 800);
      } catch {
        flash('error', 'builder.persist_import_error');
      }
    },
    [repo, flash, onAfterImport],
  );

  return (
    <div
      data-testid="persistence-toolbar"
      style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
    >
      <button
        data-testid="persist-save-btn"
        onClick={handleSave}
        disabled={!repo}
        aria-label={t('builder.persist_save')}
        style={{ ...btnStyle, opacity: repo ? 1 : 0.5 }}
      >
        {t('builder.persist_save')}
      </button>
      <button
        data-testid="persist-export-btn"
        onClick={handleExport}
        aria-label={t('builder.persist_export')}
        style={btnStyle}
      >
        {t('builder.persist_export')}
      </button>
      <button
        data-testid="persist-import-btn"
        onClick={handleImportClick}
        disabled={!repo}
        aria-label={t('builder.persist_import')}
        style={{ ...btnStyle, opacity: repo ? 1 : 0.5 }}
      >
        {t('builder.persist_import')}
      </button>

      <input
        ref={fileRef}
        data-testid="persist-import-input"
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {feedback && (
        <span
          data-testid="persist-feedback"
          role="status"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: feedback.tone === 'ok' ? 'var(--status-healthy)' : 'var(--status-critical)',
          }}
        >
          {t(feedback.key)}
        </span>
      )}
    </div>
  );
}
