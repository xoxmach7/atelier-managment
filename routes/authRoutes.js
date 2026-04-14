import express from 'express';
import {
    register,
    login,
    getCurrentUser,
    getUsers,
    updateUser,
    changePassword
} from '../controllers/authController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { validateLogin, validateRegister } from '../middleware/validation.js';

const router = express.Router();

// Публичные роуты
router.post('/login', validateLogin, asyncHandler(login));
router.post('/register', validateRegister, asyncHandler(register));  // ВРЕМЕННО без авторизации для первого пользователя

// Защищённые роуты
router.use(authenticate);

router.get('/me', asyncHandler(getCurrentUser));
router.patch('/change-password', asyncHandler(changePassword));
router.get('/users', authorize(ROLES.ADMIN), asyncHandler(getUsers));
router.patch('/users/:id', authorize(ROLES.ADMIN), asyncHandler(updateUser));

export default router;
