import { describe, it, expect, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { provisionGithubRepoTool } from '../tools/githubOps.js';
import { hudBus } from '../../hud/eventBus.js';

describe('Tool 6: provision_github_repo', () => {
  it('writes CI workflow and emits branch telemetry update', async () => {
    const wsSpy = vi.spyOn(hudBus, 'emitWorkspaceSwitch');
    const eventSpy = vi.spyOn(hudBus, 'emitEvent');

    const result = await provisionGithubRepoTool.execute({
      name: 'test-stripe-repo',
      private: true,
    });

    expect(result.name).toBe('test-stripe-repo');
    expect(result.branch).toBe('main');
    expect(result.ciWorkflowUrl).toContain('/actions');

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TOOL_CALL',
        payload: expect.objectContaining({
          tool: 'git_commit',
          args: expect.objectContaining({ branch: 'main' }),
        }),
      })
    );

    expect(wsSpy).toHaveBeenCalledWith('test-stripe-repo', expect.any(String), 'main');

    // Clean up created workflow file if needed
    const ciFile = path.resolve(process.cwd(), 'test-stripe-repo', '.github', 'workflows', 'ci.yml');
    const exists = await fs
      .access(ciFile)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    await fs.rm(path.resolve(process.cwd(), 'test-stripe-repo'), { recursive: true, force: true });
  });
});
