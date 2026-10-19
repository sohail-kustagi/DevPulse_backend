import { describe, it, expect, vi } from 'vitest';
import fs from 'fs/promises';
import { generateProjectSpecTool, scaffoldWorkspaceTool } from '../tools/specAndScaffold.js';
import { hudBus } from '../../hud/eventBus.js';

describe('Tools 2 & 3: spec and scaffold', () => {
  it('generate_project_spec writes SYSTEM_DESIGN.md and emits artifact.updated', async () => {
    const artifactSpy = vi.spyOn(hudBus, 'emitArtifact');

    const result = await generateProjectSpecTool.execute({
      name: 'test-service-spec',
      description: 'A test webhook service',
      components: ['Webhook Handler', 'HMAC Verifier'],
      borrowedFrom: 'voice-gateway',
    });

    expect(result.name).toBe('test-service-spec');
    expect(result.specPath).toBeDefined();

    const specContent = await fs.readFile(result.specPath, 'utf-8');
    expect(specContent).toContain('# TEST-SERVICE-SPEC');
    expect(specContent).toContain('mermaid');

    expect(artifactSpy).toHaveBeenCalledWith(
      'spec',
      expect.objectContaining({
        title: 'SYSTEM_DESIGN.md',
        flowchart: expect.any(Object),
      })
    );
  });

  it('scaffold_workspace creates fastapi project tree and emits terminal test results', async () => {
    const terminalSpy = vi.spyOn(hudBus, 'emitArtifact');
    const wsSwitchSpy = vi.spyOn(hudBus, 'emitWorkspaceSwitch');

    const result = await scaffoldWorkspaceTool.execute({
      name: 'test-scaffold-fastapi',
      template: 'fastapi',
      borrowFrom: ['auth.py'],
    });

    expect(result.createdFiles).toContain('app/main.py');
    expect(result.createdFiles).toContain('app/middleware/verify.py');
    expect(result.createdFiles).toContain('tests/test_middleware.py');

    expect(wsSwitchSpy).toHaveBeenCalledWith('test-scaffold-fastapi', expect.any(String), 'main');
    expect(terminalSpy).toHaveBeenCalledWith(
      'terminal',
      expect.objectContaining({
        summary: expect.stringContaining('passed'),
        tests: expect.any(Array),
      })
    );
  });
});
