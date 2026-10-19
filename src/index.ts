import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, type WebSocket } from 'ws';
import { config } from './config.js';
import { hudBus } from './hud/eventBus.js';
import { healthRouter } from './routes/health.js';
import { statusRouter } from './routes/status.js';
import { mcpRouter } from './mcp/server.js';
import { alexaRouter } from './alexa/webhook.js';

export const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (
        config.corsOrigins.includes(origin) ||
        config.corsOrigins.includes('*') ||
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly fallback
    },
    credentials: true,
  })
);

app.use(express.json());

// Mount Routes
app.use(healthRouter);
app.use(statusRouter);
app.use(mcpRouter);
app.use(alexaRouter);

// Demo trigger endpoint for manual testing from UI or curl
app.post('/api/demo/trigger', (req, res) => {
  const { eventType, payload } = req.body || {};
  switch (eventType) {
    case 'voice':
      hudBus.emitVoiceInput(payload?.text || 'Scaffold a FastAPI service for doorbell events.');
      break;
    case 'thinking':
      hudBus.emitThinking(payload?.thought || 'Planning architecture and isolation boundaries...');
      break;
    case 'tool_start':
      hudBus.emitToolStart(payload?.tool || 'scaffold_workspace', payload?.args || {});
      break;
    case 'tool_complete':
      hudBus.emitToolComplete(payload?.tool || 'scaffold_workspace', payload?.durationMs || 420);
      break;
    case 'artifact_spec':
      hudBus.emitArtifact('spec', payload || {});
      break;
    case 'artifact_diff':
      hudBus.emitArtifact('diff', payload || {});
      break;
    case 'cloud_alert':
      hudBus.emitCloudAlert(payload?.source || 'CloudWatch', payload?.message || '5xx error rate anomaly');
      break;
    default:
      if (payload) {
        hudBus.emitEvent(payload);
      }
      break;
  }
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Create HTTP Server & WebSocket Server
export const server = http.createServer(app);

export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket, req) => {
  const remoteAddr = req.socket.remoteAddress;
  console.log(`[WS] Client connected from ${remoteAddr}. Total clients: ${hudBus.clientCount + 1}`);

  hudBus.addClient(ws);

  ws.on('close', () => {
    hudBus.removeClient(ws);
    console.log(`[WS] Client disconnected. Total clients: ${hudBus.clientCount}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Socket error:', err.message);
    hudBus.removeClient(ws);
  });
});

// Upgrade handling for dual-path support: /ws/telemetry and /ws/hud
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/ws/telemetry' || pathname === '/ws/hud') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Start listening if run directly
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    console.log(`\n==================================================`);
    console.log(` OrbitOps DevPulse Backend Running`);
    console.log(` HTTP:      http://localhost:${config.port}`);
    console.log(` Health:    http://localhost:${config.port}/health`);
    console.log(` Status:    http://localhost:${config.port}/api/status`);
    console.log(` WebSocket: ws://localhost:${config.port}/ws/telemetry`);
    console.log(`            ws://localhost:${config.port}/ws/hud`);
    console.log(` CORS:      ${config.corsOrigins.join(', ')}`);
    console.log(`==================================================\n`);
  });
}
