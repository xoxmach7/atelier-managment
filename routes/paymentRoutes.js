import express from 'express';
import {
    addPrepayment,
    getSeamstressPayments,
    createSeamstressPayment,
    paySeamstress,
    getSeamstressBalance
} from '../controllers/paymentController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { validatePrepayment, validateId } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

// Предоплаты (менеджер/админ)
router.post('/prepayment', authorize(ROLES.MANAGER, ROLES.ADMIN), validatePrepayment, asyncHandler(addPrepayment));

// Выплаты швеям
router.get('/seamstress', authorize(ROLES.MANAGER, ROLES.ADMIN, ROLES.SEAMSTRESS), asyncHandler(getSeamstressPayments));
router.get('/seamstress/:seamstress_id/balance', authorize(ROLES.MANAGER, ROLES.ADMIN, ROLES.SEAMSTRESS), validateId, asyncHandler(getSeamstressBalance));
router.post('/seamstress', authorize(ROLES.MANAGER, ROLES.ADMIN), asyncHandler(createSeamstressPayment));
router.patch('/seamstress/:id/pay', authorize(ROLES.MANAGER, ROLES.ADMIN), validateId, asyncHandler(paySeamstress));

export default router;
