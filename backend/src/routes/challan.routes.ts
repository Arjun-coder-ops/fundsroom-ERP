import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as challanController from '../controllers/challan.controller';
import { createChallanSchema, updateChallanSchema } from '../validation/challan.validation';

const router = Router();

// Challans module: Sales creates/edits/confirms them. Admin has full
// access. Accounts can view challans (financial records) but not modify
// them. Warehouse does not interact with challans directly - stock is
// updated automatically when Sales confirms a challan.
const canView = authorize('ADMIN', 'SALES', 'ACCOUNTS');
const canManage = authorize('ADMIN', 'SALES');

router.use(authenticate);

router.get('/', canView, challanController.listChallans);
router.get('/:id', canView, challanController.getChallan);
router.post('/', canManage, validate(createChallanSchema), challanController.createChallan);
router.put('/:id', canManage, validate(updateChallanSchema), challanController.updateChallan);
router.post('/:id/confirm', canManage, challanController.confirmChallan);
router.post('/:id/cancel', canManage, challanController.cancelChallan);

export default router;
