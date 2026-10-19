import { describe, it, expect, vi } from 'vitest';
import { hudBus } from '../eventBus.js';
import type { WebSocket } from 'ws';

function createMockWs(): WebSocket {
  return {
    readyState: 1, // OPEN
    OPEN: 1,
    CLOSED: 3,
    CLOSING: 2,
    send: vi.fn(),
  } as unknown as WebSocket;
}

describe('HUD EventBus', () => {
  it('adds and removes clients correctly', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();

    const initial = hudBus.clientCount;
    hudBus.addClient(ws1);
    expect(hudBus.clientCount).toBe(initial + 1);

    hudBus.addClient(ws2);
    expect(hudBus.clientCount).toBe(initial + 2);

    hudBus.removeClient(ws1);
    expect(hudBus.clientCount).toBe(initial + 1);

    hudBus.removeClient(ws2);
    expect(hudBus.clientCount).toBe(initial);
  });

  it('broadcasts event with auto-generated id and timestamp to connected clients', () => {
    const ws = createMockWs();
    hudBus.addClient(ws);

    hudBus.emitEvent({
      type: 'VOICE_INPUT',
      payload: { text: 'Test voice input' },
    });

    expect(ws.send).toHaveBeenCalled();
    const lastCall = vi.mocked(ws.send).mock.calls.at(-1);
    const parsed = JSON.parse(lastCall?.[0] as string);

    expect(parsed.id).toMatch(/^evt-/);
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.type).toBe('VOICE_INPUT');
    expect(parsed.payload.text).toBe('Test voice input');

    hudBus.removeClient(ws);
  });

  it('emitVoiceInput emits dual-compatible voice payload', () => {
    const ws = createMockWs();
    hudBus.addClient(ws);

    hudBus.emitVoiceInput('Scaffold a FastAPI service', 'CUSTOM SUBTITLE');

    const lastCall = vi.mocked(ws.send).mock.calls.at(-1);
    const parsed = JSON.parse(lastCall?.[0] as string);

    expect(parsed.event).toBe('voice.intent_received');
    expect(parsed.type).toBe('VOICE_INPUT');
    expect(parsed.payload.transcript).toBe('Scaffold a FastAPI service');
    expect(parsed.payload.subtitle).toBe('CUSTOM SUBTITLE');

    hudBus.removeClient(ws);
  });

  it('emitThinking emits reasoning and latency', () => {
    const ws = createMockWs();
    hudBus.addClient(ws);

    hudBus.emitThinking('Analyzing dependency graph...', 1.4);

    const lastCall = vi.mocked(ws.send).mock.calls.at(-1);
    const parsed = JSON.parse(lastCall?.[0] as string);

    expect(parsed.event).toBe('agent.thinking');
    expect(parsed.payload.latency).toBe('1.4s');
    expect(parsed.payload.thought).toBe('Analyzing dependency graph...');

    hudBus.removeClient(ws);
  });

  it('emitToolStart and emitToolComplete produce matching tool cards', () => {
    const ws = createMockWs();
    hudBus.addClient(ws);

    hudBus.emitToolStart('scaffold_workspace', { name: 'ring-events' });
    let lastCall = vi.mocked(ws.send).mock.calls.at(-1);
    let parsed = JSON.parse(lastCall?.[0] as string);
    expect(parsed.event).toBe('mcp.tool_start');
    expect(parsed.payload.tool).toBe('scaffold_workspace');

    hudBus.emitToolComplete('scaffold_workspace', 350, 'Scaffolded 6 files', true);
    lastCall = vi.mocked(ws.send).mock.calls.at(-1);
    parsed = JSON.parse(lastCall?.[0] as string);
    expect(parsed.event).toBe('mcp.tool_complete');
    expect(parsed.payload.duration_ms).toBe(350);
    expect(parsed.payload.success).toBe(true);

    hudBus.removeClient(ws);
  });

  it('does not throw when emitting with zero clients', () => {
    expect(() => {
      hudBus.emitEvent({
        type: 'THOUGHT',
        payload: { text: 'Empty bus test' },
      });
    }).not.toThrow();
  });
});
