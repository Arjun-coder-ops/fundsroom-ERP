import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/response';
import * as challanService from '../services/challan.service';
import { AppError } from '../utils/AppError';

export const listChallans = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await challanService.listChallans(req);
  return ok(res, items, 200, meta);
});

export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await challanService.getChallanById(req.params.id);
  return ok(res, challan);
});

export const createChallan = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const challan = await challanService.createChallan(req.user.id, req.body);
  return created(res, challan);
});

export const updateChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await challanService.updateChallan(req.params.id, req.body);
  return ok(res, challan);
});

export const confirmChallan = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const challan = await challanService.confirmChallan(req.params.id, req.user.id);
  return ok(res, challan);
});

export const cancelChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await challanService.cancelChallan(req.params.id);
  return ok(res, challan);
});
