import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app } from '../../index.js';

describe('HTTP Routes', () => {
  let testServer: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      testServer = http.createServer(app);
      testServer.listen(0, () => {
        const addr = testServer.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      testServer.close(() => resolve());
    });
  });

  it('GET /health returns 200 with ok status and uptime', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.uptime).toBe('number');
    expect(data.version).toBe('1.0.0');
    expect(data.timestamp).toBeDefined();
  });

  it('GET /api/status returns wsClients and system metrics', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(typeof data.wsClients).toBe('number');
    expect(data.mcpToolsRegistered).toBe(7);
    expect(typeof data.mantleConnected).toBe('boolean');
    expect(typeof data.activeWorkspace).toBe('string');
  });

  it('POST /api/demo/trigger dispatches mock event to bus', async () => {
    const res = await fetch(`${baseUrl}/api/demo/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'voice',
        payload: { text: 'Hello from test' },
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it('POST /api/agent/turn runs agent turn and returns result', async () => {
    const res = await fetch(`${baseUrl}/api/agent/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Check cloud deployments',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.spokenSummary).toBeDefined();
    expect(data.toolCallsExecuted).toContain('check_cloud_deployments');
  });

  it('POST /api/agent/turn returns 400 if query is missing', async () => {
    const res = await fetch(`${baseUrl}/api/agent/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('GET /hud serves standalone HUD or returns 200/404 depending on file presence', async () => {
    const res = await fetch(`${baseUrl}/hud`);
    expect([200, 404]).toContain(res.status);
  });

  it('returns 404 for unknown endpoints', async () => {
    const res = await fetch(`${baseUrl}/unknown-endpoint-xyz-123`);
    expect(res.status).toBe(404);
  });
});
