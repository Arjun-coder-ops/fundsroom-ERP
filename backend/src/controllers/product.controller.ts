import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { created, ok } from '../utils/response';
import * as productService from '../services/product.service';
import { AppError } from '../utils/AppError';

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const { items, meta } = await productService.listProducts(req);
  return ok(res, items, 200, meta);
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.id);
  return ok(res, product);
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  return created(res, product);
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  return ok(res, product);
});

export const getStockMovements = asyncHandler(async (req: Request, res: Response) => {
  const movements = await productService.getStockMovements(req.params.id);
  return ok(res, movements);
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await productService.adjustStock(req.params.id, req.user.id, req.body);
  return ok(res, result);
});
