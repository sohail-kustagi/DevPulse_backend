import { Router, type Request, type Response } from 'express';
import { hudBus } from '../hud/eventBus.js';
import { config } from '../config.js';

export const statusRouter = Router();

statusRouter.get('/api/status', (_req: Request, res: Response) => {
  res.status(200).json({
    wsClients: hudBus.clientCount,
    mcpToolsRegistered: 7,
    mantleConnected: Boolean(config.bedrockMantleApiKey),
    activeWorkspace: config.workspaceDir,
    lastEventTimestamp: hudBus.lastEventTimestamp,
    environment: config.nodeEnv,
    uptime: Math.round(process.uptime()),
  });
});
