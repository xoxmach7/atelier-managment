// ============================================
// 1C INTEGRATION SERVICE
// Универсальная интеграция с 1С: Предприятие
// Поддержка: УНФ, УТ, КА, облачный 1С
// ============================================
import axios from 'axios';
import { pool } from '../config/db.js';

// ============================================
// КОНФИГУРАЦИЯ 1С
// ============================================
const ONEC_CONFIG = {
    // Таймауты
    timeout: 30000,
    retryAttempts: 3,
    
    // Форматы обмена
    supportedFormats: ['json', 'xml', 'odata'],
    
    // Типы интеграции
    integrationTypes: {
        UNF: 'УНФ',      // Управление нашей фирмой
        UT: 'УТ',        // Управление торговлей
        KA: 'КА',        // Комплексная автоматизация
        FRESH: 'Fresh',  // Облачный 1С
        ENTERPRISE: 'ERP' // 1С:ERP
    }
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ КЛИЕНТА 1С
// ============================================

/**
 * Проверка и инициализация подключения к 1С
 * @param {Object} config - Конфигурация клиента
 * @returns {Object} - Статус подключения
 */
export const testConnection = async (config) => {
    try {
        const { baseUrl, username, password, integrationType } = config;
        
        // Формируем URL в зависимости от типа 1С
        const testUrl = buildApiUrl(baseUrl, integrationType, 'test');
        
        const response = await axios.get(testUrl, {
            auth: { username, password },
            timeout: ONEC_CONFIG.timeout,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        return {
            success: true,
            connected: true,
            version: response.data?.version || 'unknown',
            integrationType,
            message: 'Подключение к 1С успешно установлено'
        };
        
    } catch (error) {
        return {
            success: false,
            connected: false,
            error: error.message,
            details: error.response?.data
        };
    }
};

/**
 * Сохранение конфигурации интеграции
 * @param {Number} companyId - ID компании (тенанта)
 * @param {Object} config - Конфигурация 1С
 */
export const saveIntegrationConfig = async (companyId, config) => {
    const { 
        integration_type, 
        base_url, 
        username, 
        password,
        database_name,
        enabled = true,
        sync_settings = {}
    } = config;
    
    // Шифруем пароль перед сохранением (в production использовать encryption)
    const encryptedPassword = Buffer.from(password).toString('base64');
    
    const result = await pool.query(
        `INSERT INTO onec_integrations 
         (company_id, integration_type, base_url, username, password, database_name, enabled, sync_settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         ON CONFLICT (company_id) 
         DO UPDATE SET 
            integration_type = $2,
            base_url = $3,
            username = $4,
            password = $5,
            database_name = $6,
            enabled = $7,
            sync_settings = $8,
            updated_at = NOW()
         RETURNING *`,
        [companyId, integration_type, base_url, username, encryptedPassword, database_name, enabled, JSON.stringify(sync_settings)]
    );
    
    return result.rows[0];
};

/**
 * Получение конфигурации интеграции
 * @param {Number} companyId - ID компании
 */
export const getIntegrationConfig = async (companyId) => {
    const result = await pool.query(
        'SELECT * FROM onec_integrations WHERE company_id = $1',
        [companyId]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    const config = result.rows[0];
    
    // Дешифруем пароль
    config.password = Buffer.from(config.password, 'base64').toString();
    
    return config;
};

/**
 * Активация/деактивация интеграции ("одним нажатием")
 * @param {Number} companyId - ID компании
 * @param {Boolean} enabled - Статус активации
 */
export const toggleIntegration = async (companyId, enabled) => {
    const result = await pool.query(
        `UPDATE onec_integrations 
         SET enabled = $2, updated_at = NOW()
         WHERE company_id = $1
         RETURNING *`,
        [companyId, enabled]
    );
    
    if (result.rows.length === 0) {
        throw new Error('Интеграция не настроена');
    }
    
    return {
        success: true,
        enabled: result.rows[0].enabled,
        message: enabled ? '✅ Интеграция с 1С активирована' : '⏸️ Интеграция с 1С деактивирована'
    };
};

// ============================================
// СИНХРОНИЗАЦИЯ ДАННЫХ
// ============================================

/**
 * Синхронизация номенклатуры (товары/услуги)
 * @param {Number} companyId - ID компании
 */
export const syncNomenclature = async (companyId) => {
    const config = await getIntegrationConfig(companyId);
    
    if (!config || !config.enabled) {
        return { success: false, message: 'Интеграция не активна' };
    }
    
    try {
        // Получаем номенклатуру из 1С
        const onecData = await fetchFrom1C(config, 'Catalog_Номенклатура');
        
        // Сохраняем в нашу БД
        const synced = await saveNomenclatureToDB(companyId, onecData);
        
        // Логируем синхронизацию
        await logSync(companyId, 'nomenclature', synced.length, 'success');
        
        return {
            success: true,
            synced: synced.length,
            message: `Синхронизировано ${synced.length} позиций номенклатуры`
        };
        
    } catch (error) {
        await logSync(companyId, 'nomenclature', 0, 'error', error.message);
        throw error;
    }
};

/**
 * Синхронизация контрагентов (клиенты)
 * @param {Number} companyId - ID компании
 */
export const syncCounterparties = async (companyId) => {
    const config = await getIntegrationConfig(companyId);
    
    if (!config || !config.enabled) {
        return { success: false, message: 'Интеграция не активна' };
    }
    
    try {
        // Получаем контрагентов из 1С
        const onecData = await fetchFrom1C(config, 'Catalog_Контрагенты');
        
        // Сохраняем клиентов
        const synced = await saveCounterpartiesToDB(companyId, onecData);
        
        await logSync(companyId, 'counterparties', synced.length, 'success');
        
        return {
            success: true,
            synced: synced.length,
            message: `Синхронизировано ${synced.length} контрагентов`
        };
        
    } catch (error) {
        await logSync(companyId, 'counterparties', 0, 'error', error.message);
        throw error;
    }
};

/**
 * Отправка заказа в 1С
 * @param {Number} orderId - ID заказа
 * @param {Number} companyId - ID компании
 */
export const sendOrderTo1C = async (orderId, companyId) => {
    const config = await getIntegrationConfig(companyId);
    
    if (!config || !config.enabled) {
        return { success: false, message: 'Интеграция не активна' };
    }
    
    // Получаем заказ из нашей БД
    const orderResult = await pool.query(
        `SELECT o.*, c.full_name as client_name, c.phone as client_phone
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         WHERE o.id = $1`,
        [orderId]
    );
    
    if (orderResult.rows.length === 0) {
        throw new Error('Заказ не найден');
    }
    
    const order = orderResult.rows[0];
    
    // Получаем позиции заказа
    const itemsResult = await pool.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [orderId]
    );
    
    // Формируем данные для 1С
    const onecOrder = {
        Номер: order.order_number,
        Дата: order.created_at,
        Контрагент: order.client_name,
        Телефон: order.client_phone,
        Сумма: order.total_amount,
        Позиции: itemsResult.rows.map(item => ({
            Номенклатура: item.description,
            Количество: item.quantity,
            Цена: item.unit_price,
            Сумма: item.total_price
        }))
    };
    
    // Отправляем в 1С
    const result = await sendTo1C(config, 'Document_ЗаказКлиента', onecOrder);
    
    // Сохраняем ID заказа в 1С
    await pool.query(
        'UPDATE orders SET onec_id = $1, onec_synced_at = NOW() WHERE id = $2',
        [result.id, orderId]
    );
    
    return {
        success: true,
        onecId: result.id,
        message: 'Заказ успешно передан в 1С'
    };
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Построение URL API в зависимости от типа 1С
 */
function buildApiUrl(baseUrl, integrationType, endpoint) {
    const cleanBase = baseUrl.replace(/\/$/, '');
    
    switch (integrationType) {
        case 'Fresh':
        case 'UNF':
            // OData протокол для облачного 1С
            return `${cleanBase}/odata/standard.odata/${endpoint}`;
        
        case 'UT':
        case 'KA':
        case 'ERP':
            // REST API для коробочных версий
            return `${cleanBase}/hs/api/${endpoint}`;
        
        default:
            return `${cleanBase}/api/${endpoint}`;
    }
}

/**
 * Получение данных из 1С
 */
async function fetchFrom1C(config, entity) {
    const url = buildApiUrl(config.base_url, config.integration_type, entity);
    
    const response = await axios.get(url, {
        auth: {
            username: config.username,
            password: config.password
        },
        timeout: ONEC_CONFIG.timeout,
        params: {
            '$format': 'json',
            '$top': 1000
        }
    });
    
    return response.data?.value || response.data || [];
}

/**
 * Отправка данных в 1С
 */
async function sendTo1C(config, entity, data) {
    const url = buildApiUrl(config.base_url, config.integration_type, entity);
    
    const response = await axios.post(url, data, {
        auth: {
            username: config.username,
            password: config.password
        },
        timeout: ONEC_CONFIG.timeout,
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    return response.data;
}

/**
 * Сохранение номенклатуры в БД
 */
async function saveNomenclatureToDB(companyId, items) {
    const synced = [];
    
    for (const item of items) {
        try {
            const result = await pool.query(
                `INSERT INTO onec_nomenclature 
                 (company_id, onec_id, name, article, type, unit, price, onec_data)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (company_id, onec_id)
                 DO UPDATE SET 
                    name = $3,
                    article = $4,
                    type = $5,
                    unit = $6,
                    price = $7,
                    onec_data = $8,
                    updated_at = NOW()
                 RETURNING *`,
                [
                    companyId,
                    item.Ref || item.Ссылка || item.id,
                    item.Description || item.Наименование || item.name,
                    item.Article || item.Артикул || '',
                    item.Type || item.ВидНоменклатуры || 'product',
                    item.Unit || item.ЕдиницаИзмерения || 'шт',
                    item.Price || item.Цена || 0,
                    JSON.stringify(item)
                ]
            );
            
            synced.push(result.rows[0]);
        } catch (err) {
            console.error('❌ Ошибка сохранения номенклатуры:', err.message);
        }
    }
    
    return synced;
}

/**
 * Сохранение контрагентов в БД
 */
async function saveCounterpartiesToDB(companyId, items) {
    const synced = [];
    
    for (const item of items) {
        try {
            // Проверяем существует ли клиент
            const existing = await pool.query(
                'SELECT id FROM customers WHERE phone = $1 AND company_id = $2',
                [item.Телефон || item.Phone, companyId]
            );
            
            if (existing.rows.length > 0) {
                // Обновляем связь с 1С
                await pool.query(
                    `UPDATE customers 
                     SET onec_id = $1, onec_synced_at = NOW()
                     WHERE id = $2`,
                    [item.Ref || item.Ссылка, existing.rows[0].id]
                );
                synced.push({ id: existing.rows[0].id, action: 'updated' });
            } else {
                // Создаём нового клиента
                const result = await pool.query(
                    `INSERT INTO customers 
                     (company_id, full_name, phone, email, onec_id, source, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     RETURNING *`,
                    [
                        companyId,
                        item.Description || item.Наименование || 'Без имени',
                        item.Телефон || item.Phone || '',
                        item.Email || item.Почта || '',
                        item.Ref || item.Ссылка,
                        '1c_sync'
                    ]
                );
                synced.push({ id: result.rows[0].id, action: 'created' });
            }
        } catch (err) {
            console.error('❌ Ошибка сохранения контрагента:', err.message);
        }
    }
    
    return synced;
}

/**
 * Логирование синхронизации
 */
async function logSync(companyId, entityType, count, status, error = null) {
    await pool.query(
        `INSERT INTO onec_sync_logs 
         (company_id, entity_type, synced_count, status, error_message, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [companyId, entityType, count, status, error]
    );
}

// ============================================
// ПУБЛИЧНЫЙ API
// ============================================

export default {
    testConnection,
    saveIntegrationConfig,
    getIntegrationConfig,
    toggleIntegration,
    syncNomenclature,
    syncCounterparties,
    sendOrderTo1C,
    ONEC_CONFIG
};
