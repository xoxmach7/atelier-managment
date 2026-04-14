// ============================================
// КОНТРОЛЛЕР КАРНИЗОВ (СКЛАД)
// ============================================
import pool from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Получить все карнизы с фильтрами
export const getCornices = async (req, res) => {
    const { type, material, search, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM cornices WHERE 1=1';
    const params = [];
    
    if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
    }
    
    if (material) {
        query += ` AND material ILIKE $${params.length + 1}`;
        params.push(`%${material}%`);
    }
    
    if (search) {
        query += ` AND (name ILIKE $${params.length + 1} OR sku ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }
    
    query += ` ORDER BY name LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
};

// Получить карниз по ID
export const getCorniceById = async (req, res) => {
    const { id } = req.params;
    
    const result = await pool.query('SELECT * FROM cornices WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Карниз не найден');
    }
    
    res.json({ success: true, data: result.rows[0] });
};

// Создать карниз
export const createCornice = async (req, res) => {
    const { sku, name, type, material, color, length_cm, max_load_kg, 
            stock_count, price, supplier } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO cornices (sku, name, type, material, color, length_cm, 
             max_load_kg, stock_count, price, supplier)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [sku, name, type, material, color, length_cm, max_load_kg, 
             stock_count, price, supplier]
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            throw new ApiError(400, 'Карниз с таким артикулом уже существует');
        }
        throw error;
    }
};

// Обновить карниз
export const updateCornice = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = ['name', 'type', 'material', 'color', 'length_cm',
                          'max_load_kg', 'stock_count', 'price', 'supplier'];
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
    const query = `UPDATE cornices SET ${setClause.join(', ')}, updated_at = NOW()
                   WHERE id = $${values.length} RETURNING *`;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Карниз не найден');
    }
    
    res.json({ success: true, data: result.rows[0] });
};

// Удалить карниз
export const deleteCornice = async (req, res) => {
    const { id } = req.params;
    
    const usedCheck = await pool.query(
        'SELECT COUNT(*) FROM order_items WHERE cornice_id = $1',
        [id]
    );
    
    if (parseInt(usedCheck.rows[0].count) > 0) {
        throw new ApiError(400, 'Нельзя удалить карниз, используемый в заказах');
    }
    
    const result = await pool.query(
        'DELETE FROM cornices WHERE id = $1 RETURNING id',
        [id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Карниз не найден');
    }
    
    res.json({ success: true, message: 'Карниз удалён' });
};
