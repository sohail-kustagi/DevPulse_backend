import { describe, it, expect } from 'vitest';
import { checkCloudDeploymentsTool } from '../tools/cloudMonitor.js';

describe('Tool 7: check_cloud_deployments', () => {
  it('returns structured metrics for AWS ECS and Heroku', async () => {
    const result = await checkCloudDeploymentsTool.execute({
      provider: 'all',
      lookbackMinutes: 15,
    });

    expect(result.ecs).toBeDefined();
    expect(result.ecs.status).toBe('Healthy (200)');
    expect(result.ecs.cpu).toBe('14%');
    expect(result.ecs.memory).toBe('42%');
    expect(result.heroku).toBeDefined();
    expect(result.heroku.status).toBe('Dyno Up');
    expect(result.summary).toContain('healthy');
  });
});
