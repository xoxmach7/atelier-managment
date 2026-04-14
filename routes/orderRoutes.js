import express from 'express';
import {
    getOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    addMeasurement,
    deleteOrder
} from '../controllers/orderController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateOrder, validateId, validatePagination } from '../middleware/validation.js';

const router = express.Router();

router.get('/', validatePagination, asyncHandler(getOrders));
router.get('/:id', validateId, asyncHandler(getOrderById));
router.post('/', validateOrder, asyncHandler(createOrder));
router.patch('/:id/status', validateId, asyncHandler(updateOrderStatus));
router.post('/:id/measurements', validateId, asyncHandler(addMeasurement));
router.delete('/:id', validateId, asyncHandler(deleteOrder));

export default router;
