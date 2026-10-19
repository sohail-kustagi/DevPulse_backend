import { describe, it, expect } from 'vitest';
import { alexaSkill } from '../webhook.js';

describe('Alexa Webhook Handlers', () => {
  it('handles LaunchRequest and returns welcome greeting', async () => {
    const launchEnvelope: any = {
      version: '1.0',
      session: { new: true, sessionId: 'sess-1', application: { applicationId: 'app-1' } },
      request: {
        type: 'LaunchRequest',
        requestId: 'req-launch-1',
        timestamp: new Date().toISOString(),
      },
    };

    const res = await alexaSkill.invoke(launchEnvelope);
    expect(res.response.outputSpeech?.ssml).toContain('DevPulse ambient engineering copilot is active');
  });

  it('handles DevPulseIntent and extracts spoken command', async () => {
    const intentEnvelope: any = {
      version: '1.0',
      session: { new: false, sessionId: 'sess-2', application: { applicationId: 'app-1' } },
      request: {
        type: 'IntentRequest',
        requestId: 'req-intent-1',
        timestamp: new Date().toISOString(),
        intent: {
          name: 'DevPulseIntent',
          confirmationStatus: 'NONE',
          slots: {
            query: {
              name: 'query',
              value: 'Borrow the auth module from voice-gateway and scaffold stripe-relay',
              confirmationStatus: 'NONE',
            },
          },
        },
      },
    };

    const res = await alexaSkill.invoke(intentEnvelope);
    expect(res.response.outputSpeech?.ssml).toContain('borrowed');
    expect(res.response.outputSpeech?.ssml).toContain('stripe-relay');
  });

  it('handles HelpIntent with guidance on capabilities', async () => {
    const helpEnvelope: any = {
      version: '1.0',
      session: { new: false, sessionId: 'sess-3', application: { applicationId: 'app-1' } },
      request: {
        type: 'IntentRequest',
        requestId: 'req-help-1',
        timestamp: new Date().toISOString(),
        intent: {
          name: 'AMAZON.HelpIntent',
          confirmationStatus: 'NONE',
        },
      },
    };

    const res = await alexaSkill.invoke(helpEnvelope);
    expect(res.response.outputSpeech?.ssml).toContain('voice-gateway');
  });
});
