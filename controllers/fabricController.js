// ============================================
// КОНТРОЛЛЕР ТКАНЕЙ (СКЛАД)
// ============================================
import pool, { withTransaction } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Получить все ткани с фильтрами
export const getFabrics = async (req, res) => {
    const { search, color, pattern, min_stock, low_stock, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM fabrics WHERE 1=1';
    const params = [];
    
    if (search) {
        query += ` AND (name ILIKE $${params.length + 1} OR 
                       hanger_number ILIKE $${params.length + 1} OR
                       composition ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }
    
    if (color) {
        query += ` AND color ILIKE $${params.length + 1}`;
        params.push(`%${color}%`);
    }
    
    if (pattern) {
        query += ` AND pattern ILIKE $${params.length + 1}`;
        params.push(`%${pattern}%`);
    }
    
    if (min_stock !== undefined) {
        query += ` AND stock_meters >= $${params.length + 1}`;
        params.push(min_stock);
    }
    
    if (low_stock) {
        // Ткани с остатком менее 10 метров
        query += ` AND stock_meters < 10`;
    }
    
    query += ` ORDER BY hanger_number LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
};

// Получить ткань по ID
export const getFabricById = async (req, res) => {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM fabrics WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Ткань не найдена');
    }
    
    res.json({ success: true, data: result.rows[0] });
};

// Получить ткань по номеру вешалки (для QR-сканера)
export const getFabricByHanger = async (req, res) => {
    const { hanger_number } = req.params;
    
    const result = await pool.query(
        'SELECT * FROM fabrics WHERE hanger_number = $1',
        [hanger_number]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Ткань не найдена');
    }
    
    res.json({ success: true, data: result.rows[0] });
};

// Создать ткань
export const createFabric = async (req, res) => {
    const { hanger_number, name, composition, width_cm, stock_meters, 
            price_per_meter, color, pattern, supplier, location } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO fabrics (hanger_number, name, composition, width_cm, stock_meters,
             price_per_meter, color, pattern, supplier, location)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [hanger_number, name, composition, width_cm, stock_meters,
             price_per_meter, color, pattern, supplier, location]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            throw new ApiError(400, 'Вешалка с таким номером уже существует');
        }
        throw error;
    }
};

// Обновить ткань
export const updateFabric = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Проверяем существование
    const exists = await pool.query('SELECT id FROM fabrics WHERE id = $1', [id]);
    if (exists.rows.length === 0) {
        throw new ApiError(404, 'Ткань не найдена');
    }
    
    // Динамическое построение UPDATE
    const allowedFields = ['name', 'composition', 'width_cm', 'stock_meters', 
                          'price_per_meter', 'color', 'pattern', 'supplier', 'location'];
    const setClause = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
            setClause.push(`${key} = $${values.length + 1}`);
            values.push(value);
        }
    }
    
    if (setClause.length === 0) {
        throw new ApiError(400, 'Нет данных для обновления');
    }
    
    values.push(id);
    const query = `UPDATE fabrics SET ${setClause.join(', ')}, updated_at = NOW() 
                   WHERE id = $${values.length} RETURNING *`;
    
    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0] });
};

// Пополнить остаток ткани (приход на склад)
export const addStock = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
        throw new ApiError(400, 'Количество должно быть положительным числом');
    }
    
    const result = await pool.query(
        `UPDATE fabrics 
         SET stock_meters = stock_meters + $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [amount, id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Ткань не найдена');
    }
    
    res.json({ 
        success: true, 
        message: `Добавлено ${amount}м на склад`,
        data: result.rows[0] 
    });
};

// Удалить ткань
export const deleteFabric = async (req, res) => {
    const { id } = req.params;
    
    // Проверяем использование в заказах
    const usedCheck = await pool.query(
        'SELECT COUNT(*) FROM order_items WHERE fabric_id = $1',
        [id]
    );
    
    if (parseInt(usedCheck.rows[0].count) > 0) {
        throw new ApiError(400, 'Нельзя удалить ткань, используемую в заказах');
    }
    
    const result = await pool.query(
        'DELETE FROM fabrics WHERE id = $1 RETURNING id',
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Ткань не найдена');
    }
    
    res.json({ success: true, message: 'Ткань удалена' });
};
