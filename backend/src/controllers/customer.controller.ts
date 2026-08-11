import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/response';
import * as customerService from '../services/customer.service';
import { AppError } from '../utils/AppError';

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await customerService.listCustomers(req);
  return ok(res, items, 200, meta);
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(req.params.id);
  return ok(res, customer);
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer(req.body);
  return created(res, customer);
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  return ok(res, customer);
});

export const addFollowUp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const followUp = await customerService.addFollowUp(req.params.id, req.user.id, req.body);
  return created(res, followUp);
});
