import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { app } from '../../index.js';

describe('MCP HTTP & JSON-RPC Endpoints (/mcp, /mcp/tools, /mcp/call)', () => {
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

  it('GET /mcp/tools returns list of registered developer tools', async () => {
    const res = await fetch(`${baseUrl}/mcp/tools`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.tools).toBeInstanceOf(Array);
    const names = data.tools.map((t: any) => t.name);
    expect(names).toContain('scan_past_projects');
    expect(names).toContain('generate_project_spec');
    expect(names).toContain('scaffold_workspace');
  });

  it('POST /mcp/call executes a tool with live telemetry', async () => {
    const res = await fetch(`${baseUrl}/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'scan_past_projects',
        arguments: {},
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.result.projects).toBeDefined();
  });

  it('POST /mcp handles JSON-RPC 2.0 tools/list request', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'req-1',
        method: 'tools/list',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jsonrpc).toBe('2.0');
    expect(data.id).toBe('req-1');
    expect(data.result.tools).toBeInstanceOf(Array);
  });

  it('POST /mcp handles JSON-RPC 2.0 tools/call request', async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'req-2',
        method: 'tools/call',
        params: {
          name: 'scan_past_projects',
          arguments: {},
        },
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.jsonrpc).toBe('2.0');
    expect(data.result.content[0].type).toBe('text');
  });
});
