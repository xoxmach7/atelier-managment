// ============================================
// КОНТРОЛЛЕР ФИНАНСОВ И ВЫПЛАТ
// Предоплаты и зарплаты швеям
// ============================================
import pool, { withTransaction } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Добавить предоплату (меняет статус заказа на "В закупе")
export const addPrepayment = async (req, res) => {
    const { order_id, amount, payment_method, notes } = req.body;
    
    const result = await withTransaction(async (client) => {
        // Создаём платёж
        const paymentResult = await client.query(`
            INSERT INTO payments (order_id, amount, payment_type, payment_method, received_by, notes)
            VALUES ($1, $2, 'prepayment', $3, $4, $5)
            RETURNING *
        `, [order_id, amount, payment_method, req.user.id, notes]);
        
        // Обновляем заказ - статус "В закупе" (procurement)
        await client.query(`
            UPDATE orders 
            SET status = 'procurement', 
                procurement_status = 'purchasing',
                prepayment_received = TRUE
            WHERE id = $1
        `, [order_id]);
        
        // Логируем
        await client.query(`
            INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
            SELECT id, status, 'procurement', $2, 'Предоплата 50% получена'
            FROM orders WHERE id = $1
        `, [order_id, req.user.id]);
        
        return paymentResult.rows[0];
    });
    
    res.json({
        success: true,
        data: result,
        message: '✅ Предоплата получена, заказ переведён в статус "В закупке"'
    });
};

// Получить все выплаты швеям
export const getSeamstressPayments = async (req, res) => {
    const { seamstress_id, status, month, year } = req.query;
    
    let query = `
        SELECT 
            sp.*,
            u.full_name as seamstress_name,
            pa.order_id,
            o.order_number,
            o.customer_name
        FROM seamstress_payments sp
        JOIN users u ON sp.seamstress_id = u.id
        JOIN production_assignments pa ON sp.assignment_id = pa.id
        JOIN orders o ON pa.order_id = o.id
        WHERE 1=1
    `;
    const params = [];
    
    if (seamstress_id) {
        query += ` AND sp.seamstress_id = $${params.length + 1}`;
        params.push(seamstress_id);
    }
    
    if (status) {
        query += ` AND sp.status = $${params.length + 1}`;
        params.push(status);
    }
    
    if (month && year) {
        query += ` AND EXTRACT(MONTH FROM sp.created_at) = $${params.length + 1} 
                  AND EXTRACT(YEAR FROM sp.created_at) = $${params.length + 2}`;
        params.push(month, year);
    }
    
    query += ` ORDER BY sp.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // Считаем итоги
    const summary = {
        total_pending: result.rows.filter(r => r.status === 'pending')
            .reduce((sum, r) => sum + parseFloat(r.total_amount), 0),
        total_paid: result.rows.filter(r => r.status === 'paid')
            .reduce((sum, r) => sum + parseFloat(r.total_amount), 0),
        count: result.rows.length
    };
    
    res.json({
        success: true,
        data: result.rows,
        summary
    });
};

// Создать выплату швеи (после завершения заказа)
export const createSeamstressPayment = async (req, res) => {
    const { assignment_id, base_amount, complexity_bonus, notes } = req.body;
    
    // Проверяем что заказ выполнен
    const assignmentCheck = await pool.query(
        `SELECT pa.*, u.full_name as seamstress_name 
         FROM production_assignments pa
         JOIN users u ON pa.assigned_to = u.id
         WHERE pa.id = $1 AND pa.status = 'ready'`,
        [assignment_id]
    );
    
    if (assignmentCheck.rows.length === 0) {
        throw new ApiError(400, 'Заказ ещё не выполнен или не найден');
    }
    
    const assignment = assignmentCheck.rows[0];
    const totalAmount = parseFloat(base_amount) + parseFloat(complexity_bonus || 0);
    
    const result = await pool.query(`
        INSERT INTO seamstress_payments 
            (assignment_id, seamstress_id, base_amount, complexity_bonus, total_amount, status, notes)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6)
        ON CONFLICT (assignment_id) DO NOTHING
        RETURNING *
    `, [assignment_id, assignment.assigned_to, base_amount, complexity_bonus || 0, totalAmount, notes]);
    
    if (result.rows.length === 0) {
        throw new ApiError(400, 'Выплата для этого заказа уже существует');
    }
    
    res.json({
        success: true,
        data: {
            ...result.rows[0],
            seamstress_name: assignment.seamstress_name
        },
        message: `💰 Выплата швеи ${assignment.seamstress_name}: ${totalAmount.toLocaleString()} ₸`
    });
};

// Выплатить зарплату швеи
export const paySeamstress = async (req, res) => {
    const { id } = req.params;
    
    const result = await pool.query(`
        UPDATE seamstress_payments 
        SET status = 'paid', 
            paid_at = NOW(),
            paid_by = $2
        WHERE id = $1 AND status = 'pending'
        RETURNING *
    `, [id, req.user.id]);
    
    if (result.rows.length === 0) {
        throw new ApiError(400, 'Выплата не найдена или уже выполнена');
    }
    
    res.json({
        success: true,
        data: result.rows[0],
        message: '✅ Выплата выполнена'
    });
};

// Получить баланс швеи (сколько должны)
export const getSeamstressBalance = async (req, res) => {
    const { seamstress_id } = req.params;
    
    const result = await pool.query(`
        SELECT 
            COALESCE(SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END), 0) as pending_amount,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
        FROM seamstress_payments
        WHERE seamstress_id = $1
    `, [seamstress_id]);
    
    res.json({
        success: true,
        data: {
            seamstress_id,
            pending_amount: parseFloat(result.rows[0].pending_amount),
            paid_amount: parseFloat(result.rows[0].paid_amount),
            pending_count: parseInt(result.rows[0].pending_count),
            paid_count: parseInt(result.rows[0].paid_count)
        }
    });
};
