import { describe, it, expect } from 'vitest';
import { mantleClient, MODEL_ID, mantleBaseURL } from '../mantleClient.js';

describe('Bedrock Mantle Client', () => {
  it('configures regional Bedrock Mantle base URL and model ID', () => {
    expect(mantleBaseURL).toMatch(/https:\/\/bedrock-mantle\..*\.api\.aws\/v1/);
    expect(MODEL_ID).toBe('openai.gpt-oss-120b');
    expect(mantleClient).toBeDefined();
    expect(mantleClient.chat).toBeDefined();
  });
});
