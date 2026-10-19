import { Router, type Request, type Response } from 'express';
import { toolRegistry } from './toolRegistry.js';

// Auto-register all 7 MCP developer tools
import './tools/pastProjects.js';
import './tools/specAndScaffold.js';
import './tools/codeInspector.js';
import './tools/githubOps.js';
import './tools/cloudMonitor.js';

export const mcpRouter = Router();

// REST / JSON-RPC fallback endpoint for local tools discovery and invocation
mcpRouter.get('/mcp/tools', (_req: Request, res: Response) => {
  const tools = toolRegistry.getAllTools().map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
  res.json({ tools });
});

mcpRouter.post('/mcp/call', async (req: Request, res: Response) => {
  const { name, arguments: args } = req.body || {};
  if (!name) {
    res.status(400).json({ error: 'Missing tool name' });
    return;
  }

  try {
    const result = await toolRegistry.executeToolWithTelemetry(name, args || {});
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// JSON-RPC 2.0 Handler on /mcp
mcpRouter.post('/mcp', async (req: Request, res: Response) => {
  const { id = 1, method, params } = req.body || {};

  if (method === 'tools/list') {
    const tools = toolRegistry.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: toolRegistry.getOpenAITools().find((ot) => ot.function.name === t.name)?.function.parameters,
    }));
    res.json({ jsonrpc: '2.0', id, result: { tools } });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    try {
      const result = await toolRegistry.executeToolWithTelemetry(name, args || {});
      res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } });
    } catch (err: any) {
      res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } });
    }
    return;
  }

  res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
});
