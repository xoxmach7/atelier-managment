import express from 'express';
import {
    getReservations,
    createReservation,
    cancelReservation,
    extendReservation,
    convertToOrder,
    getFabricAvailability
} from '../controllers/reservationController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Доступность ткани (публично для авторизованных)
router.get('/availability/:id', asyncHandler(getFabricAvailability));
router.get('/', asyncHandler(getReservations));

// Бронирование (дизайнер, менеджер)
router.post('/', authorize(ROLES.DESIGNER, ROLES.MANAGER, ROLES.ADMIN), asyncHandler(createReservation));

// Управление бронированием
router.patch('/:id/cancel', asyncHandler(cancelReservation));
router.patch('/:id/extend', asyncHandler(extendReservation));
router.post('/:id/convert', authorize(ROLES.MANAGER, ROLES.ADMIN), asyncHandler(convertToOrder));

export default router;
