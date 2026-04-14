import express from 'express';
import {
    calculateMaterials,
    getQuotes,
    getQuoteById,
    createQuote,
    sendQuote,
    approveQuote
} from '../controllers/quoteController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { validateCalculate, validateId, validatePagination } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

// Калькулятор (доступен дизайнерам)
router.post('/calculate', 
    authorize(ROLES.DESIGNER, ROLES.MANAGER, ROLES.ADMIN), 
    validateCalculate, 
    asyncHandler(calculateMaterials)
);

// Сметы
router.get('/', validatePagination, asyncHandler(getQuotes));
router.get('/:id', validateId, asyncHandler(getQuoteById));
router.post('/', authorize(ROLES.DESIGNER, ROLES.MANAGER, ROLES.ADMIN), asyncHandler(createQuote));

// Отправка КП
router.post('/:id/send', authorize(ROLES.DESIGNER, ROLES.MANAGER, ROLES.ADMIN), validateId, asyncHandler(sendQuote));

// Согласование КП (менеджер)
router.post('/:id/approve', authorize(ROLES.MANAGER, ROLES.ADMIN), validateId, asyncHandler(approveQuote));

export default router;
