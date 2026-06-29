/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DemoApp } from './demo.js';

describe('DemoApp', () => {
  it('mounts without throwing', () => {
    expect(() => render(React.createElement(DemoApp))).not.toThrow();
  });

  it('renders 6 dashboard items — one per hot-water component', () => {
    render(React.createElement(DemoApp));
    const items = screen.getAllByTestId(/^dashboard-item-/);
    expect(items).toHaveLength(6);
  });

  it('exposes the persistence toolbar in Build mode and Save shows "נשמר"', async () => {
    render(React.createElement(DemoApp));
    fireEvent.click(screen.getAllByTestId('mode-build-btn')[0]!);
    const saveBtn = await screen.findByTestId('persist-save-btn');
    expect(screen.getByTestId('persist-export-btn').textContent).toBe('ייצוא');
    expect(screen.getByTestId('persist-import-btn').textContent).toBe('ייבוא');
    fireEvent.click(saveBtn);
    const fb = await screen.findByTestId('persist-feedback');
    expect(fb.textContent).toBe('נשמר');
  });
});
