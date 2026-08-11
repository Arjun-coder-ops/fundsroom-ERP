import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as productController from '../controllers/product.controller';
import {
  createProductSchema,
  stockAdjustmentSchema,
  updateProductSchema,
} from '../validation/product.validation';

const router = Router();

// Product/Inventory module: Admin and Warehouse manage it. Sales and
// Accounts can view products (needed to build challans / check pricing)
// but cannot create/edit products or adjust stock directly.
const canView = authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS');
const canManage = authorize('ADMIN', 'WAREHOUSE');

router.use(authenticate);

router.get('/', canView, productController.listProducts);
router.get('/:id', canView, productController.getProduct);
router.get('/:id/movements', canView, productController.getStockMovements);
router.post('/', canManage, validate(createProductSchema), productController.createProduct);
router.put('/:id', canManage, validate(updateProductSchema), productController.updateProduct);
router.post('/:id/stock', canManage, validate(stockAdjustmentSchema), productController.adjustStock);

export default router;
