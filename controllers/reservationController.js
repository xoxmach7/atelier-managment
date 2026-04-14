// ============================================
// КОНТРОЛЛЕР БРОНИРОВАНИЯ ТКАНИ (Этап 2)
// Резервирование без списания со склада
// ============================================
import pool, { withTransaction } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Получить активные бронирования
export const getReservations = async (req, res) => {
    const { task_id, fabric_id, status, limit = 50 } = req.query;
    
    let query = `
        SELECT fr.*, 
               f.name as fabric_name, f.hanger_number, f.stock_meters,
               t.task_number, t.client_name, t.status as task_status,
               u.full_name as reserved_by_name
        FROM fabric_reservations fr
        JOIN fabrics f ON fr.fabric_id = f.id
        JOIN tasks t ON fr.task_id = t.id
        LEFT JOIN users u ON fr.reserved_by = u.id
        WHERE 1=1
    `;
    const params = [];
    
    if (task_id) {
        query += ` AND fr.task_id = $${params.length + 1}`;
        params.push(task_id);
    }
    
    if (fabric_id) {
        query += ` AND fr.fabric_id = $${params.length + 1}`;
        params.push(fabric_id);
    }
    
    if (status) {
        query += ` AND fr.status = $${params.length + 1}`;
        params.push(status);
    } else {
        query += ` AND fr.status = 'active'`;
    }
    
    query += ` ORDER BY fr.reserved_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
};

// Забронировать ткань
export const createReservation = async (req, res) => {
    const { task_id, fabric_id, reserved_meters, expires_days = 3, notes } = req.body;
    
    if (!reserved_meters || reserved_meters <= 0) {
        throw new ApiError(400, 'Количество метров должно быть положительным');
    }
    
    const result = await withTransaction(async (client) => {
        // 1. Проверяем задачу
        const taskCheck = await client.query(
            'SELECT id, status FROM tasks WHERE id = $1',
            [task_id]
        );
        
        if (taskCheck.rows.length === 0) {
            throw new ApiError(404, 'Задача не найдена');
        }
        
        if (taskCheck.rows[0].status === 'converted_to_order') {
            throw new ApiError(400, 'Нельзя бронировать для уже конвертированной задачи');
        }
        
        // 2. Проверяем ткань и доступность
        const fabricCheck = await client.query(
            'SELECT stock_meters, name, hanger_number FROM fabrics WHERE id = $1',
            [fabric_id]
        );
        
        if (fabricCheck.rows.length === 0) {
            throw new ApiError(404, 'Ткань не найдена');
        }
        
        const fabric = fabricCheck.rows[0];
        
        // 3. Считаем сколько уже забронировано
        const reservedResult = await client.query(
            `SELECT COALESCE(SUM(reserved_meters), 0) as total_reserved
             FROM fabric_reservations 
             WHERE fabric_id = $1 AND status = 'active'`,
            [fabric_id]
        );
        
        const totalReserved = parseFloat(reservedResult.rows[0].total_reserved);
        const availableStock = parseFloat(fabric.stock_meters) - totalReserved;
        
        if (availableStock < reserved_meters) {
            throw new ApiError(400, 
                `Недостаточно свободной ткани. В наличии: ${fabric.stock_meters}м, ` +
                `уже забронировано: ${totalReserved}м, доступно: ${availableStock}м, ` +
                `запрошено: ${reserved_meters}м`
            );
        }
        
        // 4. Создаём бронирование
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expires_days);
        
        const reservationResult = await client.query(
            `INSERT INTO fabric_reservations 
             (task_id, fabric_id, reserved_meters, status, reserved_by, expires_at, notes)
             VALUES ($1, $2, $3, 'active', $4, $5, $6) RETURNING *`,
            [task_id, fabric_id, reserved_meters, req.user?.id, expiresAt, notes]
        );
        
        const reservation = reservationResult.rows[0];
        
        // 5. Логируем
        await client.query(
            `INSERT INTO task_history (task_id, action, new_value, performed_by, notes)
             VALUES ($1, 'fabric_reserved', $2, $3, $4)`,
            [task_id, 
             JSON.stringify({ fabric: fabric.name, meters: reserved_meters }),
             req.user?.id,
             `Забронирована ткань ${fabric.hanger_number}: ${reserved_meters}м`]
        );
        
        return {
            ...reservation,
            fabric_name: fabric.name,
            hanger_number: fabric.hanger_number,
            available_after_reserve: availableStock - reserved_meters
        };
    });
    
    res.status(201).json({ 
        success: true, 
        message: 'Ткань забронирована',
        data: result 
    });
};

// Отменить бронирование
export const cancelReservation = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    const result = await withTransaction(async (client) => {
        // Получаем бронирование
        const resCheck = await client.query(
            'SELECT * FROM fabric_reservations WHERE id = $1',
            [id]
        );
        
        if (resCheck.rows.length === 0) {
            throw new ApiError(404, 'Бронирование не найдено');
        }
        
        const reservation = resCheck.rows[0];
        
        if (reservation.status !== 'active') {
            throw new ApiError(400, 'Можно отменить только активное бронирование');
        }
        
        // Обновляем статус
        await client.query(
            `UPDATE fabric_reservations 
             SET status = 'cancelled' WHERE id = $1`,
            [id]
        );
        
        // Логируем
        await client.query(
            `INSERT INTO task_history (task_id, action, old_value, new_value, performed_by, notes)
             VALUES ($1, 'reservation_cancelled', $2, $3, $4, $5)`,
            [reservation.task_id,
             'active',
             'cancelled',
             req.user?.id,
             reason || 'Бронирование отменено']
        );
        
        return reservation;
    });
    
    res.json({ 
        success: true, 
        message: 'Бронирование отменено',
        data: result 
    });
};

// Продлить бронирование
export const extendReservation = async (req, res) => {
    const { id } = req.params;
    const { additional_days = 3 } = req.body;
    
    const result = await pool.query(
        `UPDATE fabric_reservations 
         SET expires_at = expires_at + INTERVAL '${additional_days} days'
         WHERE id = $1 AND status = 'active'
         RETURNING *`,
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Активное бронирование не найдено');
    }
    
    res.json({ success: true, data: result.rows[0] });
};

// Конвертировать бронирование в списание (при создании заказа)
export const convertToOrder = async (req, res) => {
    const { id } = req.params;
    const { order_id } = req.body;
    
    const result = await withTransaction(async (client) => {
        // Получаем бронирование
        const resResult = await client.query(
            'SELECT * FROM fabric_reservations WHERE id = $1',
            [id]
        );
        
        if (resResult.rows.length === 0) {
            throw new ApiError(404, 'Бронирование не найдено');
        }
        
        const reservation = resResult.rows[0];
        
        if (reservation.status !== 'active') {
            throw new ApiError(400, 'Можно конвертировать только активное бронирование');
        }
        
        // Списываем со склада
        await client.query(
            `UPDATE fabrics SET stock_meters = stock_meters - $1 WHERE id = $2`,
            [reservation.reserved_meters, reservation.fabric_id]
        );
        
        // Обновляем бронирование
        await client.query(
            `UPDATE fabric_reservations 
             SET status = 'converted', converted_to_order_id = $1, converted_at = NOW()
             WHERE id = $2`,
            [order_id, id]
        );
        
        return { converted: true, order_id };
    });
    
    res.json({ success: true, data: result });
};

// Получить доступность ткани (с учётом бронирований)
export const getFabricAvailability = async (req, res) => {
    const { id } = req.params;
    
    const result = await pool.query(
        `SELECT f.id, f.name, f.hanger_number, f.stock_meters,
                COALESCE(
                    (SELECT SUM(reserved_meters) 
                     FROM fabric_reservations 
                     WHERE fabric_id = f.id AND status = 'active'), 
                    0
                ) as reserved_meters,
                f.stock_meters - COALESCE(
                    (SELECT SUM(reserved_meters) 
                     FROM fabric_reservations 
                     WHERE fabric_id = f.id AND status = 'active'), 
                    0
                ) as available_meters
         FROM fabrics f
         WHERE f.id = $1`,
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Ткань не найдена');
    }
    
    // Список активных бронирований
    const reservations = await pool.query(
        `SELECT fr.*, t.task_number, t.client_name
         FROM fabric_reservations fr
         JOIN tasks t ON fr.task_id = t.id
         WHERE fr.fabric_id = $1 AND fr.status = 'active'
         ORDER BY fr.reserved_at`,
        [id]
    );
    
    res.json({
        success: true,
        data: {
            ...result.rows[0],
            active_reservations: reservations.rows
        }
    });
};
