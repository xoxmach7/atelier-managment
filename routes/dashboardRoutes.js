// ============================================
// DASHBOARD / АНАЛИТИКА РОУТЫ
// ============================================
import express from 'express';
import {
    getDashboardStats,
    getOrdersChart,
    getRevenueChart,
    getOrderStatusStats,
    getTopFabrics,
    getTopCustomers,
    getEmployeeActivity,
    getAlerts,
    getFullDashboard
} from '../controllers/dashboardController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';

const router = express.Router();

// Все роуты только для admin
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

// Полный дашборд (всё в одном)
router.get('/full', asyncHandler(getFullDashboard));

// Статистика
router.get('/stats', asyncHandler(getDashboardStats));

// Графики
router.get('/charts/orders', asyncHandler(getOrdersChart));
router.get('/charts/revenue', asyncHandler(getRevenueChart));
router.get('/charts/status', asyncHandler(getOrderStatusStats));

// Топ
router.get('/top/fabrics', asyncHandler(getTopFabrics));
router.get('/top/customers', asyncHandler(getTopCustomers));

// Активность
router.get('/employees', asyncHandler(getEmployeeActivity));

// Алерты
router.get('/alerts', asyncHandler(getAlerts));

export default router;
