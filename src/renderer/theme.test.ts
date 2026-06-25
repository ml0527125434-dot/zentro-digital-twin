import { describe, it, expect } from 'vitest';
import {
  healthPresentation,
  nodeStatusPresentation,
  sensorStatePresentation,
} from './theme.js';
import { HealthState, NodeStatus, SensorState } from '../domain/types.js';

describe('healthPresentation', () => {
  it('returns a cssVar starting with --status- for every HealthState', () => {
    for (const h of Object.values(HealthState)) {
      const p = healthPresentation(h);
      expect(p.cssVar).toMatch(/^--status-/);
    }
  });

  it('Healthy → --status-healthy', () => {
    expect(healthPresentation(HealthState.Healthy).cssVar).toBe('--status-healthy');
  });

  it('Critical → --status-critical', () => {
    expect(healthPresentation(HealthState.Critical).cssVar).toBe('--status-critical');
  });

  it('Offline → --status-offline', () => {
    expect(healthPresentation(HealthState.Offline).cssVar).toBe('--status-offline');
  });

  it('Maintenance → --status-maintenance', () => {
    expect(healthPresentation(HealthState.Maintenance).cssVar).toBe('--status-maintenance');
  });

  it('Commissioning → --status-commissioning', () => {
    expect(healthPresentation(HealthState.Commissioning).cssVar).toBe('--status-commissioning');
  });

  it('every HealthState has a non-empty label and icon', () => {
    for (const h of Object.values(HealthState)) {
      const p = healthPresentation(h);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.icon.length).toBeGreaterThan(0);
    }
  });

  it('no cssVar contains a hex colour', () => {
    for (const h of Object.values(HealthState)) {
      expect(healthPresentation(h).cssVar).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});

describe('nodeStatusPresentation', () => {
  it('returns a cssVar starting with --node- for every NodeStatus', () => {
    for (const s of Object.values(NodeStatus)) {
      expect(nodeStatusPresentation(s).cssVar).toMatch(/^--node-/);
    }
  });

  it('Ok → --node-ok', () => {
    expect(nodeStatusPresentation(NodeStatus.Ok).cssVar).toBe('--node-ok');
  });

  it('Scald → --node-scald', () => {
    expect(nodeStatusPresentation(NodeStatus.Scald).cssVar).toBe('--node-scald');
  });

  it('Cold → --node-cold', () => {
    expect(nodeStatusPresentation(NodeStatus.Cold).cssVar).toBe('--node-cold');
  });

  it('every NodeStatus has a non-empty label and icon', () => {
    for (const s of Object.values(NodeStatus)) {
      const p = nodeStatusPresentation(s);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.icon.length).toBeGreaterThan(0);
    }
  });
});

describe('sensorStatePresentation', () => {
  it('returns a cssVar starting with --sensor- for every SensorState', () => {
    for (const s of Object.values(SensorState)) {
      expect(sensorStatePresentation(s).cssVar).toMatch(/^--sensor-/);
    }
  });

  it('Live → --sensor-live', () => {
    expect(sensorStatePresentation(SensorState.Live).cssVar).toBe('--sensor-live');
  });

  it('Lost → --sensor-lost', () => {
    expect(sensorStatePresentation(SensorState.Lost).cssVar).toBe('--sensor-lost');
  });
});
