import { describe, it, expect } from 'vitest';
import { scanPastProjectsTool } from '../tools/pastProjects.js';

describe('Tool 1: scan_past_projects', () => {
  it('scans projects and returns list with reusable modules', async () => {
    const result = await scanPastProjectsTool.execute({});
    expect(result.projects).toBeInstanceOf(Array);
    expect(result.projects.length).toBeGreaterThan(0);

    const first = result.projects[0];
    expect(first.name).toBeDefined();
    expect(first.modules).toBeInstanceOf(Array);
    expect(result.summary).toContain('Found');
  });

  it('identifies modules like auth or middleware', async () => {
    const result = await scanPastProjectsTool.execute({});
    const voiceGateway = result.projects.find((p) => p.name === 'voice-gateway');
    if (voiceGateway) {
      expect(voiceGateway.modules.some((m) => m.includes('auth'))).toBe(true);
    }
  });
});
