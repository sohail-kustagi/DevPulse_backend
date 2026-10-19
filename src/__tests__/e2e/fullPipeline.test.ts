import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import { app, wss } from '../../index.js';

describe('End-to-End Pipeline (Voice -> Orchestrator -> MCP Tools -> WebSocket HUD)', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);

      server.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url || '', `http://${request.headers.host}`);
        if (url.pathname === '/ws/telemetry' || url.pathname === '/ws/hud') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        } else {
          socket.destroy();
        }
      });

      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      wss.close(() => {
        server.close(() => resolve());
      });
    });
  });

  it('runs complete voice-to-HUD execution flow', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/telemetry`);

    await new Promise<void>((resolve) => ws.once('open', resolve));

    const receivedEvents: any[] = [];
    ws.on('message', (data) => {
      try {
        receivedEvents.push(JSON.parse(data.toString()));
      } catch {}
    });

    // Small delay to ensure client registration
    await new Promise((r) => setTimeout(r, 50));

    // Send Alexa Voice request
    const res = await fetch(`http://127.0.0.1:${port}/api/alexa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '1.0',
        session: { new: false, sessionId: 'sess-e2e', application: { applicationId: 'app-e2e' } },
        request: {
          type: 'IntentRequest',
          requestId: 'req-e2e-1',
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
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.response.outputSpeech.ssml).toContain('borrowed');
    expect(data.response.outputSpeech.ssml).toContain('stripe-relay');

    // Allow time for all WebSocket events to propagate
    await new Promise((r) => setTimeout(r, 100));

    const eventTypes = receivedEvents.map((e) => e.event || e.type);
    expect(eventTypes).toContain('voice.intent_received');
    expect(eventTypes).toContain('mcp.tool_start');
    expect(eventTypes).toContain('mcp.tool_complete');

    ws.close();
  });
});
