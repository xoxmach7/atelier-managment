// ============================================
// КОНТРОЛЛЕР ЗАКАЗОВ
// ============================================
import pool, { withTransaction } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Генерация номера заказа
const generateOrderNumber = async (client) => {
    const year = new Date().getFullYear();
    const result = await client.query(
        `SELECT COUNT(*) FROM orders WHERE order_number LIKE $1`,
        [`О-${year}-%`]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `О-${year}-${String(count).padStart(3, '0')}`;
};

// Получить все заказы с фильтрами
export const getOrders = async (req, res) => {
    const { status, customer_id, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
        SELECT o.*, 
               c.full_name as customer_name,
               c.phone as customer_phone
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE 1=1
    `;
    const params = [];
    
    if (status) {
        query += ` AND o.status = $${params.length + 1}`;
        params.push(status);
    }
    
    if (customer_id) {
        query += ` AND o.customer_id = $${params.length + 1}`;
        params.push(customer_id);
    }
    
    if (search) {
        query += ` AND (o.order_number ILIKE $${params.length + 1} 
                       OR c.full_name ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }
    
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
};

// Получить заказ с полной информацией
export const getOrderById = async (req, res) => {
    const { id } = req.params;
    
    // Основная информация о заказе
    const orderResult = await pool.query(
        `SELECT o.*, c.full_name, c.phone, c.email, c.address
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         WHERE o.id = $1`,
        [id]
    );
    
    if (orderResult.rows.length === 0) {
        throw new ApiError(404, 'Заказ не найден');
    }
    
    const order = orderResult.rows[0];
    
    // Позиции заказа
    const itemsResult = await pool.query(
        `SELECT oi.*,
                f.name as fabric_name, f.hanger_number,
                cor.name as cornice_name, cor.sku as cornice_sku,
                s.name as service_name
         FROM order_items oi
         LEFT JOIN fabrics f ON oi.fabric_id = f.id
         LEFT JOIN cornices cor ON oi.cornice_id = cor.id
         LEFT JOIN services s ON oi.service_id = s.id
         WHERE oi.order_id = $1`,
        [id]
    );
    
    // Замеры
    const measurementsResult = await pool.query(
        'SELECT * FROM measurements WHERE order_id = $1 ORDER BY room_name',
        [id]
    );
    
    // История статусов
    const historyResult = await pool.query(
        'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at DESC',
        [id]
    );
    
    res.json({
        success: true,
        data: {
            ...order,
            items: itemsResult.rows,
            measurements: measurementsResult.rows,
            status_history: historyResult.rows
        }
    });
};

// Создать заказ
export const createOrder = async (req, res) => {
    const { customer_id, installation_address, measurement_date, 
            planned_completion, notes, items } = req.body;
    
    // items - массив позиций заказа
    // [{ item_type: 'fabric', fabric_id: 1, quantity: 6, ... }]
    
    const result = await withTransaction(async (client) => {
        // 1. Проверяем клиента
        const customerCheck = await client.query(
            'SELECT id FROM customers WHERE id = $1',
            [customer_id]
        );
        if (customerCheck.rows.length === 0) {
            throw new ApiError(404, 'Клиент не найден');
        }
        
        // 2. Генерируем номер заказа
        const orderNumber = await generateOrderNumber(client);
        
        // 3. Создаём заказ
        const orderResult = await client.query(
            `INSERT INTO orders (order_number, customer_id, installation_address,
             status, measurement_date, planned_completion, notes, total_amount)
             VALUES ($1, $2, $3, 'new', $4, $5, $6, 0)
             RETURNING *`,
            [orderNumber, customer_id, installation_address, 
             measurement_date, planned_completion, notes]
        );
        const order = orderResult.rows[0];
        
        // 4. Обрабатываем позиции заказа и списываем со склада
        let totalAmount = 0;
        
        if (items && items.length > 0) {
            for (const item of items) {
                const { item_type, fabric_id, cornice_id, service_id, quantity } = item;
                
                if (quantity <= 0) {
                    throw new ApiError(400, 'Количество должно быть положительным');
                }
                
                let unitPrice = 0;
                let totalPrice = 0;
                
                // Проверяем и списываем со склада
                if (item_type === 'fabric' && fabric_id) {
                    const fabric = await client.query(
                        'SELECT stock_meters, price_per_meter FROM fabrics WHERE id = $1',
                        [fabric_id]
                    );
                    if (fabric.rows.length === 0) {
                        throw new ApiError(404, `Ткань #${fabric_id} не найдена`);
                    }
                    if (fabric.rows[0].stock_meters < quantity) {
                        throw new ApiError(400, 
                            `Недостаточно ткани на склаке. В наличии: ${fabric.rows[0].stock_meters}м`);
                    }
                    // Списываем
                    await client.query(
                        'UPDATE fabrics SET stock_meters = stock_meters - $1 WHERE id = $2',
                        [quantity, fabric_id]
                    );
                    unitPrice = fabric.rows[0].price_per_meter;
                    totalPrice = unitPrice * quantity;
                    
                } else if (item_type === 'cornice' && cornice_id) {
                    const cornice = await client.query(
                        'SELECT stock_count, price FROM cornices WHERE id = $1',
                        [cornice_id]
                    );
                    if (cornice.rows.length === 0) {
                        throw new ApiError(404, `Карниз #${cornice_id} не найден`);
                    }
                    if (cornice.rows[0].stock_count < quantity) {
                        throw new ApiError(400, 
                            `Недостаточно карнизов на складе. В наличии: ${cornice.rows[0].stock_count}`);
                    }
                    await client.query(
                        'UPDATE cornices SET stock_count = stock_count - $1 WHERE id = $2',
                        [quantity, cornice_id]
                    );
                    unitPrice = cornice.rows[0].price;
                    totalPrice = unitPrice * quantity;
                    
                } else if (item_type === 'service' && service_id) {
                    const service = await client.query(
                        'SELECT price_per_unit FROM services WHERE id = $1',
                        [service_id]
                    );
                    if (service.rows.length === 0) {
                        throw new ApiError(404, `Услуга #${service_id} не найдена`);
                    }
                    unitPrice = service.rows[0].price_per_unit;
                    totalPrice = unitPrice * quantity;
                }
                
                totalAmount += parseFloat(totalPrice);
                
                // Добавляем позицию
                await client.query(
                    `INSERT INTO order_items (order_id, item_type, fabric_id, cornice_id, 
                     service_id, quantity, unit_price, total_price, sewing_type, 
                     window_width_cm, window_height_cm, folds_count, notes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [order.id, item_type, fabric_id || null, cornice_id || null, 
                     service_id || null, quantity, unitPrice, totalPrice,
                     item.sewing_type || null, item.window_width_cm || null,
                     item.window_height_cm || null, item.folds_count || null,
                     item.notes || null]
                );
            }
        }
        
        // 5. Обновляем итоговую сумму
        await client.query(
            'UPDATE orders SET total_amount = $1 WHERE id = $2',
            [totalAmount, order.id]
        );
        
        // 6. Логируем создание
        await client.query(
            `INSERT INTO activity_log (entity_type, entity_id, action, new_values, performed_by)
             VALUES ('order', $1, 'created', $2, $3)`,
            [order.id, JSON.stringify({ total_amount: totalAmount }), 'system']
        );
        
        return { ...order, total_amount: totalAmount };
    });
    
    res.status(201).json({ success: true, data: result });
};

// Обновить статус заказа
export const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const result = await withTransaction(async (client) => {
        // Получаем текущий статус
        const currentResult = await client.query(
            'SELECT status, total_amount FROM orders WHERE id = $1',
            [id]
        );
        
        if (currentResult.rows.length === 0) {
            throw new ApiError(404, 'Заказ не найден');
        }
        
        const oldStatus = currentResult.rows[0].status;
        
        // Обновляем статус
        const updateResult = await client.query(
            `UPDATE orders SET status = $1, updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [status, id]
        );
        
        // Записываем в историю
        await client.query(
            `INSERT INTO order_status_history (order_id, old_status, new_status, notes, changed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, oldStatus, status, notes, req.user?.name || 'system']
        );
        
        return updateResult.rows[0];
    });
    
    res.json({ success: true, data: result });
};

// Добавить замер к заказу
export const addMeasurement = async (req, res) => {
    const { id } = req.params;
    const { room_name, window_name, width_cm, height_cm, depth_cm, 
            mounting_type, notes } = req.body;
    
    // Проверяем заказ
    const orderCheck = await pool.query('SELECT id FROM orders WHERE id = $1', [id]);
    if (orderCheck.rows.length === 0) {
        throw new ApiError(404, 'Заказ не найден');
    }
    
    const result = await pool.query(
        `INSERT INTO measurements (order_id, room_name, window_name, width_cm, 
         height_cm, depth_cm, mounting_type, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [id, room_name, window_name, width_cm, height_cm, depth_cm, mounting_type, notes]
    );
    
    // Меняем статус на "measurement"
    await pool.query(
        "UPDATE orders SET status = 'measurement' WHERE id = $1 AND status = 'new'",
        [id]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
};

// Удалить заказ (только "новые" или "отменённые")
export const deleteOrder = async (req, res) => {
    const { id } = req.params;
    
    const result = await withTransaction(async (client) => {
        // Проверяем статус
        const statusCheck = await client.query(
            'SELECT status FROM orders WHERE id = $1',
            [id]
        );
        
        if (statusCheck.rows.length === 0) {
            throw new ApiError(404, 'Заказ не найден');
        }
        
        const status = statusCheck.rows[0].status;
        if (!['new', 'cancelled'].includes(status)) {
            throw new ApiError(400, 'Можно удалить только новые или отменённые заказы');
        }
        
        // Возвращаем товары на склад
        const items = await client.query(
            'SELECT item_type, fabric_id, cornice_id, quantity FROM order_items WHERE order_id = $1',
            [id]
        );
        
        for (const item of items.rows) {
            if (item.item_type === 'fabric' && item.fabric_id) {
                await client.query(
                    'UPDATE fabrics SET stock_meters = stock_meters + $1 WHERE id = $2',
                    [item.quantity, item.fabric_id]
                );
            } else if (item.item_type === 'cornice' && item.cornice_id) {
                await client.query(
                    'UPDATE cornices SET stock_count = stock_count + $1 WHERE id = $2',
                    [item.quantity, item.cornice_id]
                );
            }
        }
        
        // Удаляем заказ (каскадно удалятся позиции, замеры, история)
        await client.query('DELETE FROM orders WHERE id = $1', [id]);
        
        return { deleted: true, returned_items: items.rows.length };
    });
    
    res.json({ success: true, message: 'Заказ удалён', data: result });
};
