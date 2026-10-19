import { describe, it, expect, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { inspectFileTool, triageAndPatchTool } from '../tools/codeInspector.js';
import { hudBus } from '../../hud/eventBus.js';

describe('Tools 4 & 5: inspect_file_and_audit & triage_and_patch_error', () => {
  const testFile = path.resolve(process.cwd(), 'scratch_test_target.py');

  it('inspect_file_and_audit reads lines with 1-based indexing and slices ranges', async () => {
    await fs.writeFile(
      testFile,
      `import os\nimport sys\ndef run():\n    print("hello")\n    return 42\n`,
      'utf-8'
    );

    const result = await inspectFileTool.execute({
      filePath: testFile,
      startLine: 3,
      endLine: 5,
      lint: true,
    });

    expect(result.startLine).toBe(3);
    expect(result.endLine).toBe(5);
    expect(result.content).toContain('3: def run():');
    expect(result.content).toContain('4:     print("hello")');
    expect(result.content).toContain('5:     return 42');
  });

  it('triage_and_patch_error diagnose mode explains traceback', async () => {
    const result = await triageAndPatchTool.execute({
      mode: 'diagnose',
      filePath: testFile,
      errorTrace: 'KeyError: "Stripe-Signature" in request.query_params',
    });

    expect(result.mode).toBe('diagnose');
    expect(result.diagnosis).toContain('HMAC signature header');
    expect(result.recommendedPatch).toBeDefined();
  });

  it('triage_and_patch_error patch mode applies diff and emits HUD diff & terminal artifacts', async () => {
    const artifactSpy = vi.spyOn(hudBus, 'emitArtifact');

    await fs.writeFile(
      testFile,
      `def authenticate(request):\n    sig = request.query_params.get('Stripe-Signature')\n    return sig\n`,
      'utf-8'
    );

    const result = await triageAndPatchTool.execute({
      mode: 'patch',
      filePath: testFile,
      searchReplace: {
        search: "sig = request.query_params.get('Stripe-Signature')",
        replace: "sig = request.headers.get('Stripe-Signature')",
      },
    });

    expect(result.mode).toBe('patch');
    expect(result.diff).toContain('- sig = request.query_params.get');
    expect(result.diff).toContain('+ sig = request.headers.get');

    const patched = await fs.readFile(testFile, 'utf-8');
    expect(patched).toContain("request.headers.get('Stripe-Signature')");

    expect(artifactSpy).toHaveBeenCalledWith(
      'diff',
      expect.objectContaining({
        diff: expect.any(String),
        testResult: expect.objectContaining({ passed: 12 }),
      })
    );

    // Clean up scratch file
    await fs.unlink(testFile).catch(() => {});
  });
});
