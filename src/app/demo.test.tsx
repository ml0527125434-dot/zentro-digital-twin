/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
