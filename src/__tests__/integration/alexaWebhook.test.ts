import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app } from '../../index.js';

describe('Alexa Webhook POST /api/alexa Integration', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('POST /api/alexa with LaunchRequest returns 200 with SSML output', async () => {
    const res = await fetch(`${baseUrl}/api/alexa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '1.0',
        session: { new: true, sessionId: 'sess-int-1', application: { applicationId: 'app-1' } },
        request: {
          type: 'LaunchRequest',
          requestId: 'req-int-1',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response).toBeDefined();
    expect(data.response.outputSpeech.type).toBe('SSML');
    expect(data.response.outputSpeech.ssml).toContain('<speak>');
  });
});
