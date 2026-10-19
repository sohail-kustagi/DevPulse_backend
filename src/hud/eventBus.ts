import { EventEmitter } from 'events';
import type { WebSocket } from 'ws';

export interface HudEventEnvelope {
  id?: string;
  timestamp?: string;
  workspace?: string;
  type?: 'VOICE_INPUT' | 'THOUGHT' | 'TOOL_CALL' | 'ARTIFACT_UPDATE';
  event?:
    | 'voice.intent_received'
    | 'agent.thinking'
    | 'mcp.tool_start'
    | 'mcp.tool_complete'
    | 'artifact.updated'
    | 'workspace.switched'
    | 'cloud.alert';
  payload: Record<string, unknown>;
}

class HudEventBus extends EventEmitter {
  private clients: Set<WebSocket> = new Set();
  private lastTimestamp: string | null = null;
  private eventCounter = 0;

  get clientCount(): number {
    return this.clients.size;
  }

  get lastEventTimestamp(): string | null {
    return this.lastTimestamp;
  }

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    // Send initial handshake / welcome state
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            id: `init-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'THOUGHT',
            payload: {
              model: 'bedrock/openai.gpt-oss-120b',
              text: 'Connected to OrbitOps DevPulse Backend. Real-time telemetry feed active.',
              latency: 0.1,
            },
          })
        );
      }
    } catch {
      // Ignore initial handshake send errors
    }
  }

  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
  }

  emitEvent(data: HudEventEnvelope | Record<string, unknown>): void {
    this.eventCounter += 1;
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.lastTimestamp = now.toISOString();

    const envelope: Record<string, unknown> = {
      id: (data as HudEventEnvelope).id || `evt-${Date.now()}-${this.eventCounter}`,
      timestamp: (data as HudEventEnvelope).timestamp || timestamp,
      ...data,
    };

    const message = JSON.stringify(envelope);

    // Broadcast to all connected WebSockets
    for (const client of this.clients) {
      try {
        if (client.readyState === client.OPEN) {
          client.send(message);
        } else if (client.readyState === client.CLOSED || client.readyState === client.CLOSING) {
          this.clients.delete(client);
        }
      } catch {
        this.clients.delete(client);
      }
    }

    // Also emit locally on EventEmitter
    this.emit('broadcast', envelope);
  }

  // --- Voice & Thought Helpers ---
  emitVoiceInput(text: string, subtitle = 'ALEXA VOICE SERVICE · ECHO DOT'): void {
    this.emitEvent({
      event: 'voice.intent_received',
      type: 'VOICE_INPUT',
      payload: {
        text,
        transcript: text,
        query: text,
        subtitle,
      },
    });
  }

  emitThinking(thought: string, latency: string | number = '1.2s', stage = 'Reasoning'): void {
    const latencySec = typeof latency === 'number' ? `${latency.toFixed(1)}s` : latency;
    this.emitEvent({
      event: 'agent.thinking',
      type: 'THOUGHT',
      payload: {
        thought,
        text: thought,
        stage,
        latency: latencySec,
        model: 'bedrock/openai.gpt-oss-120b',
      },
    });
  }

  // --- MCP Tool Lifecycle Helpers ---
  emitToolStart(tool: string, args: Record<string, unknown> = {}): void {
    this.emitEvent({
      event: 'mcp.tool_start',
      type: 'TOOL_CALL',
      payload: {
        tool,
        args,
        latency: 0.1,
      },
    });
  }

  emitToolComplete(
    tool: string,
    durationMs = 420,
    summary?: string,
    success = true
  ): void {
    this.emitEvent({
      event: 'mcp.tool_complete',
      payload: {
        tool,
        duration_ms: durationMs,
        summary: summary || `${tool} finished in ${durationMs}ms`,
        success,
      },
    });
  }

  // --- Artifact & Inspector Helpers ---
  emitArtifact(
    kind: 'spec' | 'diff' | 'terminal',
    payload: Record<string, unknown>
  ): void {
    if (kind === 'spec') {
      this.emitEvent({
        event: 'artifact.updated',
        type: 'ARTIFACT_UPDATE',
        payload: {
          kind: 'spec',
          artifact_type: 'spec',
          spec: payload.spec || {
            title: payload.title || 'SYSTEM_DESIGN.md',
            flowchart: payload.flowchart || {
              node1: { title: 'voice-gateway', desc: 'Reference Auth' },
              node2: { title: 'Auth Adapter', desc: 'HMAC-SHA256' },
              node3: { title: payload.name || 'target-service', desc: 'Ingress Webhook' },
              note: 'Idempotency & HMAC verification active',
            },
            contract: payload.contract || 'POST /v1/events',
            content: payload.content || '# System Design Spec',
          },
        },
      });
    } else if (kind === 'diff') {
      this.emitEvent({
        event: 'artifact.updated',
        type: 'ARTIFACT_UPDATE',
        payload: {
          kind: 'diff',
          artifact_type: 'code_diff',
          file_path: payload.filePath || payload.file_path || 'app/main.py',
          summary: payload.summary || 'Applied fix patch',
          diff: payload.diff || payload.content || '',
          content: payload.content || payload.diff || '',
          test_result: payload.testResult || payload.test_result || {
            passed: 12,
            failed: 0,
            duration_ms: 640,
          },
          tests: payload.tests || [12, 12],
        },
      });
    } else if (kind === 'terminal') {
      this.emitEvent({
        type: 'ARTIFACT_UPDATE',
        payload: {
          kind: 'terminal',
          content: payload.content || '',
          suite: payload.suite || 'tests/test_suite.py',
          summary: payload.summary || '12 passed in 0.64s',
          tests: payload.tests || [
            { name: 'test_auth_headers', status: 'PASSED', percent: '100%' },
          ],
        },
      });
    }
  }

  // --- Workspace & Cloud Helpers ---
  emitWorkspaceSwitch(projectName: string, path?: string, branch = 'main'): void {
    this.emitEvent({
      event: 'workspace.switched',
      payload: {
        project_name: projectName,
        path: path || `~/projects/${projectName}`,
        branch,
      },
    });
  }

  emitCloudAlert(source = 'CloudWatch', message: string): void {
    this.emitEvent({
      event: 'cloud.alert',
      payload: {
        source,
        message,
      },
    });
  }
}

export const hudBus = new HudEventBus();
