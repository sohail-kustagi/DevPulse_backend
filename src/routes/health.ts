import { Router, type Request, type Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
