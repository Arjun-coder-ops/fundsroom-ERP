import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';
import * as dashboardService from '../services/dashboard.service';

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await dashboardService.getDashboardStats();
  return ok(res, stats);
});
