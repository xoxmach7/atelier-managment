// ============================================
// КОНТРОЛЛЕР КЛИЕНТОВ
// ============================================
import pool, { withTransaction } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Получить всех клиентов
export const getCustomers = async (req, res) => {
    const { search, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM customers';
    const params = [];
    
    if (search) {
        query += ' WHERE full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1';
        params.push(`%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
};

// Получить одного клиента с его заказами
export const getCustomerById = async (req, res) => {
    const { id } = req.params;
    
    // Клиент
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
        throw new ApiError(404, 'Клиент не найден');
    }
    
    // Заказы клиента
    const ordersResult = await pool.query(
        `SELECT id, order_number, status, total_amount, created_at, 
                planned_completion, installation_date
         FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`,
        [id]
    );
    
    res.json({
        success: true,
        data: {
            ...customerResult.rows[0],
            orders: ordersResult.rows
        }
    });
};

// Создать клиента
export const createCustomer = async (req, res) => {
    const { full_name, phone, email, address, notes } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO customers (full_name, phone, email, address, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [full_name, phone, email, address, notes]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            throw new ApiError(400, 'Клиент с таким телефоном уже существует');
        }
        throw error;
    }
};

// Обновить клиента
export const updateCustomer = async (req, res) => {
    const { id } = req.params;
    const { full_name, phone, email, address, notes } = req.body;
    
    // Проверяем существование
    const exists = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
    if (exists.rows.length === 0) {
        throw new ApiError(404, 'Клиент не найден');
    }
    
    const result = await pool.query(
        `UPDATE customers 
         SET full_name = COALESCE($1, full_name),
             phone = COALESCE($2, phone),
             email = COALESCE($3, email),
             address = COALESCE($4, address),
             notes = COALESCE($5, notes),
             updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [full_name, phone, email, address, notes, id]
    );
    
    res.json({ success: true, data: result.rows[0] });
};

// Удалить клиента (только если нет заказов)
export const deleteCustomer = async (req, res) => {
    const { id } = req.params;
    
    // Проверяем заказы
    const ordersCheck = await pool.query(
        'SELECT COUNT(*) FROM orders WHERE customer_id = $1',
        [id]
    );
    
    if (parseInt(ordersCheck.rows[0].count) > 0) {
        throw new ApiError(400, 'Нельзя удалить клиента с активными заказами');
    }
    
    const result = await pool.query(
        'DELETE FROM customers WHERE id = $1 RETURNING id',
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Клиент не найден');
    }
    
    res.json({ success: true, message: 'Клиент удалён' });
};
