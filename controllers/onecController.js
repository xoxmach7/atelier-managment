// ============================================
// 1C INTEGRATION CONTROLLER
// API для управления интеграцией с 1С
// ============================================
import { pool } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';
import onecService from '../services/onecService.js';

// ============================================
// НАСТРОЙКА ИНТЕГРАЦИИ
// ============================================

/**
 * Тестирование подключения к 1С
 * POST /api/onec/test-connection
 */
export const testConnection = async (req, res) => {
    const { base_url, username, password, integration_type } = req.body;
    
    if (!base_url || !username || !password) {
        throw new ApiError(400, 'Необходимо указать base_url, username и password');
    }
    
    const result = await onecService.testConnection({
        baseUrl: base_url,
        username,
        password,
        integrationType: integration_type || 'UNF'
    });
    
    res.json({
        success: result.success,
        data: result,
        message: result.message || result.error
    });
};

/**
 * Сохранение конфигурации интеграции
 * POST /api/onec/config
 */
export const saveConfig = async (req, res) => {
    const companyId = req.user.company_id || req.user.id; // company_id или fallback на user.id
    
    const config = await onecService.saveIntegrationConfig(companyId, req.body);
    
    res.json({
        success: true,
        message: '✅ Конфигурация 1С сохранена',
        data: {
            id: config.id,
            integration_type: config.integration_type,
            base_url: config.base_url,
            enabled: config.enabled,
            created_at: config.created_at
        }
    });
};

/**
 * Получение конфигурации
 * GET /api/onec/config
 */
export const getConfig = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    
    const config = await onecService.getIntegrationConfig(companyId);
    
    if (!config) {
        return res.json({
            success: true,
            data: null,
            message: 'Интеграция с 1С не настроена'
        });
    }
    
    res.json({
        success: true,
        data: {
            id: config.id,
            integration_type: config.integration_type,
            base_url: config.base_url,
            username: config.username,
            database_name: config.database_name,
            enabled: config.enabled,
            sync_settings: config.sync_settings,
            last_sync: config.last_sync,
            created_at: config.created_at,
            updated_at: config.updated_at
        }
    });
};

/**
 * Активация/деактивация интеграции ("одним нажатием")
 * PATCH /api/onec/toggle
 */
export const toggleIntegration = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
        throw new ApiError(400, 'Необходимо указать enabled (true/false)');
    }
    
    const result = await onecService.toggleIntegration(companyId, enabled);
    
    res.json({
        success: true,
        message: result.message,
        data: { enabled: result.enabled }
    });
};

// ============================================
// СИНХРОНИЗАЦИЯ
// ============================================

/**
 * Синхронизация номенклатуры
 * POST /api/onec/sync/nomenclature
 */
export const syncNomenclature = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    
    const result = await onecService.syncNomenclature(companyId);
    
    res.json(result);
};

/**
 * Синхронизация контрагентов
 * POST /api/onec/sync/counterparties
 */
export const syncCounterparties = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    
    const result = await onecService.syncCounterparties(companyId);
    
    res.json(result);
};

/**
 * Полная синхронизация
 * POST /api/onec/sync/all
 */
export const syncAll = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    
    const results = {
        nomenclature: null,
        counterparties: null
    };
    
    try {
        results.nomenclature = await onecService.syncNomenclature(companyId);
    } catch (error) {
        results.nomenclature = { success: false, error: error.message };
    }
    
    try {
        results.counterparties = await onecService.syncCounterparties(companyId);
    } catch (error) {
        results.counterparties = { success: false, error: error.message };
    }
    
    res.json({
        success: true,
        message: 'Синхронизация завершена',
        data: results
    });
};

// ============================================
// ОБМЕН ЗАКАЗАМИ
// ============================================

/**
 * Отправка заказа в 1С
 * POST /api/onec/orders/:id/send
 */
export const sendOrder = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    const orderId = req.params.id;
    
    const result = await onecService.sendOrderTo1C(orderId, companyId);
    
    res.json(result);
};

/**
 * Получение статуса синхронизации заказа
 * GET /api/onec/orders/:id/status
 */
export const getOrderSyncStatus = async (req, res) => {
    const orderId = req.params.id;
    
    const result = await pool.query(
        'SELECT onec_id, onec_synced_at, onec_error FROM orders WHERE id = $1',
        [orderId]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Заказ не найден');
    }
    
    const order = result.rows[0];
    
    res.json({
        success: true,
        data: {
            synced: !!order.onec_id,
            onec_id: order.onec_id,
            synced_at: order.onec_synced_at,
            error: order.onec_error
        }
    });
};

// ============================================
// ИСТОРИЯ И ЛОГИ
// ============================================

/**
 * Получение логов синхронизации
 * GET /api/onec/logs
 */
export const getSyncLogs = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(
        `SELECT * FROM onec_sync_logs 
         WHERE company_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [companyId, limit, offset]
    );
    
    const countResult = await pool.query(
        'SELECT COUNT(*) FROM onec_sync_logs WHERE company_id = $1',
        [companyId]
    );
    
    res.json({
        success: true,
        data: result.rows,
        pagination: {
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        }
    });
};

/**
 * Получение синхронизированной номенклатуры
 * GET /api/onec/nomenclature
 */
export const getNomenclature = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    const { search, type, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM onec_nomenclature WHERE company_id = $1';
    const params = [companyId];
    let paramIndex = 2;
    
    if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR article ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }
    
    if (type) {
        query += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
    }
    
    query += ` ORDER BY name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
        success: true,
        data: result.rows
    });
};

// ============================================
// АДМИНИСТРИРОВАНИЕ (для нас - подключение клиентов)
// ============================================

/**
 * Активация интеграции для клиента ("одним нажатием")
 * POST /api/onec/admin/activate
 * Только для админов
 */
export const activateForClient = async (req, res) => {
    const { company_id, config } = req.body;
    
    if (!company_id || !config) {
        throw new ApiError(400, 'Необходимо указать company_id и config');
    }
    
    // Проверяем существование компании/пользователя
    const userCheck = await pool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [company_id]
    );
    
    if (userCheck.rows.length === 0) {
        throw new ApiError(404, 'Компания не найдена');
    }
    
    // Сохраняем конфигурацию
    const savedConfig = await onecService.saveIntegrationConfig(company_id, {
        ...config,
        enabled: true
    });
    
    // Пробуем тестовое подключение
    const testResult = await onecService.testConnection({
        baseUrl: config.base_url,
        username: config.username,
        password: config.password,
        integrationType: config.integration_type || 'UNF'
    });
    
    res.json({
        success: true,
        message: `✅ Интеграция с 1С активирована для клиента ${userCheck.rows[0].email}`,
        data: {
            config: {
                id: savedConfig.id,
                integration_type: savedConfig.integration_type,
                enabled: savedConfig.enabled
            },
            connection_test: testResult
        }
    });
};

/**
 * Получение списка всех интеграций (для админов)
 * GET /api/onec/admin/integrations
 */
export const getAllIntegrations = async (req, res) => {
    const { enabled, limit = 50, offset = 0 } = req.query;
    
    let query = `
        SELECT i.*, u.email, u.full_name 
        FROM onec_integrations i
        LEFT JOIN users u ON i.company_id = u.id
        WHERE 1=1
    `;
    const params = [];
    
    if (enabled !== undefined) {
        params.push(enabled === 'true');
        query += ` AND i.enabled = $${params.length}`;
    }
    
    query += ` ORDER BY i.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    res.json({
        success: true,
        data: result.rows.map(row => ({
            id: row.id,
            company_id: row.company_id,
            client_email: row.email,
            client_name: row.full_name,
            integration_type: row.integration_type,
            base_url: row.base_url,
            enabled: row.enabled,
            last_sync: row.last_sync,
            updated_at: row.updated_at
        }))
    });
};

/**
 * Деактивация интеграции клиента
 * DELETE /api/onec/admin/:company_id
 */
export const deactivateClient = async (req, res) => {
    const { company_id } = req.params;
    
    const result = await onecService.toggleIntegration(parseInt(company_id), false);
    
    res.json({
        success: true,
        message: `⏸️ Интеграция деактивирована для клиента ${company_id}`
    });
};

// ============================================
// СТАТУС ИНТЕГРАЦИИ (для клиентского UI)
// ============================================

/**
 * Получение полного статуса интеграции
 * GET /api/onec/status
 */
export const getIntegrationStatus = async (req, res) => {
    const companyId = req.user.company_id || req.user.id;
    
    const config = await onecService.getIntegrationConfig(companyId);
    
    if (!config) {
        return res.json({
            success: true,
            data: {
                configured: false,
                enabled: false,
                message: 'Интеграция с 1С не настроена'
            }
        });
    }
    
    // Получаем статистику
    const statsResult = await pool.query(
        `SELECT 
            COUNT(*) as total_syncs,
            COUNT(*) FILTER (WHERE status = 'success') as success_count,
            COUNT(*) FILTER (WHERE status = 'error') as error_count,
            MAX(created_at) as last_sync
         FROM onec_sync_logs 
         WHERE company_id = $1`,
        [companyId]
    );
    
    const stats = statsResult.rows[0];
    
    // Тестируем подключение
    const connectionTest = config.enabled ? 
        await onecService.testConnection({
            baseUrl: config.base_url,
            username: config.username,
            password: config.password,
            integrationType: config.integration_type
        }) : 
        { connected: false, message: 'Интеграция отключена' };
    
    res.json({
        success: true,
        data: {
            configured: true,
            enabled: config.enabled,
            integration_type: config.integration_type,
            base_url: config.base_url,
            connection_status: connectionTest.connected ? 'connected' : 'disconnected',
            connection_message: connectionTest.message || connectionTest.error,
            sync_stats: {
                total_syncs: parseInt(stats.total_syncs),
                success_count: parseInt(stats.success_count),
                error_count: parseInt(stats.error_count),
                last_sync: stats.last_sync
            },
            can_sync: config.enabled && connectionTest.connected
        }
    });
};
