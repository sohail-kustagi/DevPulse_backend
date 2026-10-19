import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import { app, wss } from '../../index.js';
import { hudBus } from '../../hud/eventBus.js';

describe('WebSocket Integration (/ws/telemetry & /ws/hud)', () => {
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

  it('connects to /ws/telemetry and receives initial connection handshake', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/telemetry`);

    const message = await new Promise<string>((resolve, reject) => {
      ws.on('message', (data) => resolve(data.toString()));
      ws.on('error', reject);
    });

    const parsed = JSON.parse(message);
    expect(parsed.type).toBe('THOUGHT');
    expect(parsed.payload.text).toContain('Connected to OrbitOps DevPulse Backend');

    ws.close();
  });

  it('connects to /ws/hud (Fire TV / dev overview endpoint)', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/hud`);

    const message = await new Promise<string>((resolve, reject) => {
      ws.on('message', (data) => resolve(data.toString()));
      ws.on('error', reject);
    });

    const parsed = JSON.parse(message);
    expect(parsed.id).toBeDefined();

    ws.close();
  });

  it('broadcasts event to multiple connected clients', async () => {
    const ws1 = new WebSocket(`ws://127.0.0.1:${port}/ws/telemetry`);
    const ws2 = new WebSocket(`ws://127.0.0.1:${port}/ws/hud`);

    // Wait for both to connect and consume initial message
    await Promise.all([
      new Promise<void>((resolve) => ws1.once('open', resolve)),
      new Promise<void>((resolve) => ws2.once('open', resolve)),
    ]);

    // Small delay to ensure registration in hudBus
    await new Promise((r) => setTimeout(r, 50));

    const p1 = new Promise<any>((resolve) => {
      ws1.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.event === 'mcp.tool_start') resolve(parsed);
      });
    });

    const p2 = new Promise<any>((resolve) => {
      ws2.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.event === 'mcp.tool_start') resolve(parsed);
      });
    });

    hudBus.emitToolStart('generate_project_spec', { name: 'stripe-relay' });

    const [msg1, msg2] = await Promise.all([p1, p2]);

    expect(msg1.event).toBe('mcp.tool_start');
    expect(msg1.payload.tool).toBe('generate_project_spec');
    expect(msg2.event).toBe('mcp.tool_start');
    expect(msg2.payload.tool).toBe('generate_project_spec');

    ws1.close();
    ws2.close();
  });

  it('rejects WebSocket upgrades on unknown paths', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/unknown`);

    const wasRejected = await new Promise<boolean>((resolve) => {
      ws.on('unexpected-response', () => resolve(true));
      ws.on('error', () => resolve(true));
      ws.on('open', () => resolve(false));
    });

    expect(wasRejected).toBe(true);
    ws.close();
  });
});
