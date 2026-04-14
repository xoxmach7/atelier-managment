// ============================================
// КОНТРОЛЛЕР ЗАДАЧ/ЛИДОВ (Этап 1)
// ============================================
import pool, { withTransaction } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Генерация номера задачи
const generateTaskNumber = async (client) => {
    const year = new Date().getFullYear();
    const result = await client.query(
        `SELECT COUNT(*) FROM tasks WHERE task_number LIKE $1`,
        [`З-${year}-%`]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `З-${year}-${String(count).padStart(3, '0')}`;
};

// Получить все задачи с фильтрами
export const getTasks = async (req, res) => {
    const { status, designer_id, source, search, priority, limit = 50, offset = 0 } = req.query;
    
    let query = `
        SELECT t.*, 
               u.full_name as designer_name,
               c.full_name as customer_name,
               COUNT(m.id) as measurements_count,
               COUNT(fr.id) as reservations_count
        FROM tasks t
        LEFT JOIN users u ON t.assigned_designer_id = u.id
        LEFT JOIN customers c ON t.customer_id = c.id
        LEFT JOIN measurements m ON m.task_id = t.id
        LEFT JOIN fabric_reservations fr ON fr.task_id = t.id AND fr.status = 'active'
        WHERE 1=1
    `;
    const params = [];
    
    if (status) {
        query += ` AND t.status = $${params.length + 1}`;
        params.push(status);
    }
    
    if (designer_id) {
        query += ` AND t.assigned_designer_id = $${params.length + 1}`;
        params.push(designer_id);
    }
    
    if (source) {
        query += ` AND t.source = $${params.length + 1}`;
        params.push(source);
    }
    
    if (priority) {
        query += ` AND t.priority = $${params.length + 1}`;
        params.push(priority);
    }
    
    if (search) {
        query += ` AND (t.client_name ILIKE $${params.length + 1} 
                       OR t.client_phone ILIKE $${params.length + 1}
                       OR t.task_number ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }
    
    query += ` GROUP BY t.id, u.full_name, c.full_name 
               ORDER BY t.priority DESC, t.created_at DESC 
               LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
};

// Получить одну задачу полностью
export const getTaskById = async (req, res) => {
    const { id } = req.params;
    
    // Основная задача
    const taskResult = await pool.query(
        `SELECT t.*, 
                u.full_name as designer_name,
                c.full_name as customer_name, c.email as customer_email
         FROM tasks t
         LEFT JOIN users u ON t.assigned_designer_id = u.id
         LEFT JOIN customers c ON t.customer_id = c.id
         WHERE t.id = $1`,
        [id]
    );
    
    if (taskResult.rows.length === 0) {
        throw new ApiError(404, 'Задача не найдена');
    }
    
    const task = taskResult.rows[0];
    
    // Фото
    const photosResult = await pool.query(
        `SELECT p.*, u.full_name as taken_by_name
         FROM photos p
         LEFT JOIN users u ON p.taken_by = u.id
         WHERE p.entity_type = 'task' AND p.entity_id = $1
         ORDER BY p.taken_at DESC`,
        [id]
    );
    
    // Замеры
    const measurementsResult = await pool.query(
        `SELECT m.*, f.name as fabric_name, f.hanger_number
         FROM measurements m
         LEFT JOIN fabrics f ON m.selected_fabric_id = f.id
         WHERE m.task_id = $1
         ORDER BY m.measured_at DESC`,
        [id]
    );
    
    // Бронирования
    const reservationsResult = await pool.query(
        `SELECT fr.*, f.name as fabric_name, f.hanger_number, f.stock_meters
         FROM fabric_reservations fr
         JOIN fabrics f ON fr.fabric_id = f.id
         WHERE fr.task_id = $1
         ORDER BY fr.reserved_at DESC`,
        [id]
    );
    
    // Сметы
    const quotesResult = await pool.query(
        `SELECT q.*, 
                (SELECT COUNT(*) FROM quote_items WHERE quote_id = q.id) as items_count
         FROM quotes q
         WHERE q.task_id = $1
         ORDER BY q.created_at DESC`,
        [id]
    );
    
    // История
    const historyResult = await pool.query(
        `SELECT th.*, u.full_name as performed_by_name
         FROM task_history th
         LEFT JOIN users u ON th.performed_by = u.id
         WHERE th.task_id = $1
         ORDER BY th.performed_at DESC`,
        [id]
    );
    
    res.json({
        success: true,
        data: {
            ...task,
            photos: photosResult.rows,
            measurements: measurementsResult.rows,
            reservations: reservationsResult.rows,
            quotes: quotesResult.rows,
            history: historyResult.rows
        }
    });
};

// Создать лид/задачу
export const createTask = async (req, res) => {
    const {
        client_name, client_phone, client_address,
        customer_id, source, description, client_wishes,
        preferred_date, deadline, priority = 1,
        assigned_designer_id
    } = req.body;
    
    const result = await withTransaction(async (client) => {
        // Генерируем номер
        const taskNumber = await generateTaskNumber(client);
        
        // Создаём задачу
        const taskResult = await client.query(
            `INSERT INTO tasks (task_number, client_name, client_phone, client_address,
             customer_id, source, description, client_wishes, preferred_date, deadline,
             priority, assigned_designer_id, created_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'lead')
             RETURNING *`,
            [taskNumber, client_name, client_phone, client_address,
             customer_id || null, source || 'other', description, client_wishes,
             preferred_date, deadline, priority, assigned_designer_id || null,
             req.user?.id || null]
        );
        
        const task = taskResult.rows[0];
        
        // Логируем создание
        await client.query(
            `INSERT INTO task_history (task_id, action, new_value, performed_by, notes)
             VALUES ($1, 'created', $2, $3, 'Задача создана')`,
            [task.id, JSON.stringify({ status: 'lead' }), req.user?.id]
        );
        
        return task;
    });
    
    res.status(201).json({ success: true, data: result });
};

// Обновить статус задачи
export const updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const result = await withTransaction(async (client) => {
        // Получаем текущий статус
        const currentResult = await client.query(
            'SELECT status FROM tasks WHERE id = $1',
            [id]
        );
        
        if (currentResult.rows.length === 0) {
            throw new ApiError(404, 'Задача не найдена');
        }
        
        const oldStatus = currentResult.rows[0].status;
        
        // Обновляем
        const updateResult = await client.query(
            `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, id]
        );
        
        // Логируем
        await client.query(
            `INSERT INTO task_history (task_id, action, old_value, new_value, performed_by, notes)
             VALUES ($1, 'status_changed', $2, $3, $4, $5)`,
            [id, oldStatus, status, req.user?.id, notes]
        );
        
        return updateResult.rows[0];
    });
    
    res.json({ success: true, data: result });
};

// Назначить дизайнера
export const assignDesigner = async (req, res) => {
    const { id } = req.params;
    const { designer_id } = req.body;
    
    // Проверяем что пользователь - дизайнер
    const userCheck = await pool.query(
        `SELECT role FROM users WHERE id = $1`,
        [designer_id]
    );
    
    if (userCheck.rows.length === 0) {
        throw new ApiError(404, 'Пользователь не найден');
    }
    
    if (userCheck.rows[0].role !== 'designer') {
        throw new ApiError(400, 'Назначать можно только дизайнера');
    }
    
    const result = await pool.query(
        `UPDATE tasks SET assigned_designer_id = $1, updated_at = NOW() 
         WHERE id = $2 RETURNING *`,
        [designer_id, id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Задача не найдена');
    }
    
    res.json({ success: true, data: result.rows[0] });
};

// Добавить фото к задаче
export const addTaskPhoto = async (req, res) => {
    const { id } = req.params;
    const { url, thumbnail_url, description } = req.body;
    
    // Проверяем задачу
    const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
        throw new ApiError(404, 'Задача не найдена');
    }
    
    const result = await pool.query(
        `INSERT INTO photos (entity_type, entity_id, url, thumbnail_url, description, taken_by)
         VALUES ('task', $1, $2, $3, $4, $5) RETURNING *`,
        [id, url, thumbnail_url, description, req.user?.id]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
};

// Добавить замер
export const addMeasurement = async (req, res) => {
    const { id } = req.params;
    const {
        room_name, window_name, width_cm, height_cm, depth_cm, ceiling_height_cm,
        window_type, mounting_type, has_radiator, has_slope, obstacles,
        selected_fabric_id, selected_cornice_type, notes
    } = req.body;
    
    // Проверяем задачу
    const taskCheck = await pool.query('SELECT id, assigned_designer_id FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
        throw new ApiError(404, 'Задача не найдена');
    }
    
    const result = await pool.query(
        `INSERT INTO measurements (task_id, room_name, window_name, width_cm, height_cm,
         depth_cm, ceiling_height_cm, window_type, mounting_type, has_radiator,
         has_slope, obstacles, selected_fabric_id, selected_cornice_type, notes, measured_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [id, room_name, window_name, width_cm, height_cm, depth_cm, ceiling_height_cm,
         window_type, mounting_type, has_radiator, has_slope, obstacles,
         selected_fabric_id || null, selected_cornice_type, notes, req.user?.id]
    );
    
    // Обновляем статус задачи
    await pool.query(
        `UPDATE tasks SET status = 'measurement_done', updated_at = NOW() WHERE id = $1`,
        [id]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
};

// Удалить задачу (только lead/lost/postponed)
export const deleteTask = async (req, res) => {
    const { id } = req.params;
    
    const statusCheck = await pool.query(
        'SELECT status FROM tasks WHERE id = $1',
        [id]
    );
    
    if (statusCheck.rows.length === 0) {
        throw new ApiError(404, 'Задача не найдена');
    }
    
    const status = statusCheck.rows[0].status;
    
    if (!['lead', 'lost', 'postponed'].includes(status)) {
        throw new ApiError(400, 'Удалить можно только лиды в статусе lead, lost или postponed');
    }
    
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'Задача удалена' });
};
