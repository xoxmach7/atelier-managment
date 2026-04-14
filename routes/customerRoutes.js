import express from 'express';
import {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
} from '../controllers/customerController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { customerValidators } from '../middleware/validator.js';

const router = express.Router();

router.get('/', asyncHandler(getCustomers));
router.get('/:id', asyncHandler(getCustomerById));
router.post('/', customerValidators.create, asyncHandler(createCustomer));
router.patch('/:id', customerValidators.update, asyncHandler(updateCustomer));
router.delete('/:id', asyncHandler(deleteCustomer));

export default router;
