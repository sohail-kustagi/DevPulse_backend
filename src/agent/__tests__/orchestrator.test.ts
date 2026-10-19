import { describe, it, expect, vi } from 'vitest';
import { runAgentTurn } from '../orchestrator.js';
import { hudBus } from '../../hud/eventBus.js';

describe('Bedrock Mantle Orchestrator', () => {
  it('executes multi-step tool chain for scaffolding requests and returns spoken summary', async () => {
    const thinkingSpy = vi.spyOn(hudBus, 'emitThinking');

    const result = await runAgentTurn(
      'Borrow the auth module from voice-gateway and scaffold stripe-relay'
    );

    expect(result.spokenSummary).toContain('borrowed');
    expect(result.spokenSummary).toContain('stripe-relay');
    expect(result.toolCallsExecuted).toContain('scan_past_projects');
    expect(result.toolCallsExecuted).toContain('generate_project_spec');
    expect(result.toolCallsExecuted).toContain('scaffold_workspace');
    expect(thinkingSpy).toHaveBeenCalled();
  });

  it('executes diagnostic and patch tool chain for error triage', async () => {
    const result = await runAgentTurn(
      'Fix the KeyError in middleware verify.py and run pytest'
    );

    expect(result.spokenSummary).toContain('patched');
    expect(result.toolCallsExecuted).toContain('triage_and_patch_error:diagnose');
    expect(result.toolCallsExecuted).toContain('triage_and_patch_error:patch');
  });

  it('executes cloud deployment check for cloud status inquiries', async () => {
    const result = await runAgentTurn(
      'Check AWS CloudWatch and Heroku error rates'
    );

    expect(result.spokenSummary).toContain('AWS ECS');
    expect(result.toolCallsExecuted).toContain('check_cloud_deployments');
  });
});
