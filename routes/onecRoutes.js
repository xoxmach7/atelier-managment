// ============================================
// 1C INTEGRATION ROUTES
// ============================================
import express from 'express';
import {
    testConnection,
    saveConfig,
    getConfig,
    toggleIntegration,
    syncNomenclature,
    syncCounterparties,
    syncAll,
    sendOrder,
    getOrderSyncStatus,
    getSyncLogs,
    getNomenclature,
    activateForClient,
    getAllIntegrations,
    deactivateClient,
    getIntegrationStatus
} from '../controllers/onecController.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { validateId } from '../middleware/validation.js';

const router = express.Router();

// ============================================
// ПУБЛИЧНЫЕ РОУТЫ (для клиентов)
// ============================================
router.use(authenticate);

// Статус интеграции
router.get('/status', asyncHandler(getIntegrationStatus));

// Настройка
router.post('/test-connection', asyncHandler(testConnection));
router.get('/config', asyncHandler(getConfig));
router.post('/config', asyncHandler(saveConfig));
router.patch('/toggle', asyncHandler(toggleIntegration));

// Синхронизация
router.post('/sync/nomenclature', authorize(ROLES.MANAGER, ROLES.ADMIN), asyncHandler(syncNomenclature));
router.post('/sync/counterparties', authorize(ROLES.MANAGER, ROLES.ADMIN), asyncHandler(syncCounterparties));
router.post('/sync/all', authorize(ROLES.MANAGER, ROLES.ADMIN), asyncHandler(syncAll));

// Обмен заказами
router.post('/orders/:id/send', validateId, authorize(ROLES.MANAGER, ROLES.ADMIN), asyncHandler(sendOrder));
router.get('/orders/:id/status', validateId, asyncHandler(getOrderSyncStatus));

// Логи и номенклатура
router.get('/logs', asyncHandler(getSyncLogs));
router.get('/nomenclature', asyncHandler(getNomenclature));

// ============================================
// АДМИНИСТРАТИВНЫЕ РОУТЫ ("одним нажатием" подключить клиента)
// ============================================
router.post('/admin/activate', 
    authorize(ROLES.ADMIN), 
    asyncHandler(activateForClient)
);

router.get('/admin/integrations', 
    authorize(ROLES.ADMIN), 
    asyncHandler(getAllIntegrations)
);

router.delete('/admin/:company_id', 
    authorize(ROLES.ADMIN), 
    asyncHandler(deactivateClient)
);

export default router;
