import express from 'express';
import {
    register,
    login,
    getCurrentUser,
    getUsers,
    updateUser,
    changePassword
} from '../controllers/authController.js';
import {
    forgotPassword,
    verifyResetToken,
    resetPassword
} from '../controllers/passwordResetController.js';
import { checkAccountLockout, getLockoutStatus, unlockAccount } from '../middleware/accountLockout.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { validateLogin, validateRegister } from '../middleware/validation.js';

const router = express.Router();

// Публичные роуты
router.post('/login', checkAccountLockout, validateLogin, asyncHandler(login));
router.post('/register', validateRegister, asyncHandler(register));  // ВРЕМЕННО без авторизации для первого пользователя

// Восстановление пароля (публичные)
router.post('/forgot-password', asyncHandler(forgotPassword));
router.get('/verify-reset-token', asyncHandler(verifyResetToken));
router.post('/reset-password', asyncHandler(resetPassword));

// Защищённые роуты
router.use(authenticate);

router.get('/me', asyncHandler(getCurrentUser));
router.patch('/change-password', asyncHandler(changePassword));
router.get('/users', authorize(ROLES.ADMIN), asyncHandler(getUsers));
router.patch('/users/:id', authorize(ROLES.ADMIN), asyncHandler(updateUser));

// Управление блокировками (только admin)
router.get('/lockout-status', authorize(ROLES.ADMIN), asyncHandler(getLockoutStatus));
router.delete('/unlock-account/:email', authorize(ROLES.ADMIN), asyncHandler(unlockAccount));

export default router;
