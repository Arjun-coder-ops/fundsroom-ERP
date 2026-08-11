import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as customerController from '../controllers/customer.controller';
import {
  createCustomerSchema,
  createFollowUpSchema,
  updateCustomerSchema,
} from '../validation/customer.validation';

const router = Router();

// Customers module: Admin, Sales, and Accounts can access it.
// Warehouse staff have no business reason to see customer/CRM data.
const canViewCustomers = authorize('ADMIN', 'SALES', 'ACCOUNTS');
const canManageCustomers = authorize('ADMIN', 'SALES');

router.use(authenticate);

router.get('/', canViewCustomers, customerController.listCustomers);
router.get('/:id', canViewCustomers, customerController.getCustomer);
router.post('/', canManageCustomers, validate(createCustomerSchema), customerController.createCustomer);
router.put('/:id', canManageCustomers, validate(updateCustomerSchema), customerController.updateCustomer);
router.post('/:id/followups', canManageCustomers, validate(createFollowUpSchema), customerController.addFollowUp);

export default router;
