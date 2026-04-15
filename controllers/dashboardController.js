// ============================================
// DASHBOARD / АНАЛИТИКА ДЛЯ АДМИНА
// ============================================
import pool from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// ============================================
// ОБЩАЯ СТАТИСТИКА
// ============================================
export const getDashboardStats = async (req, res) => {
    const { period = '30days' } = req.query;
    
    // Определяем период
    const periodMap = {
        '7days': "CURRENT_DATE - INTERVAL '7 days'",
        '30days': "CURRENT_DATE - INTERVAL '30 days'",
        '90days': "CURRENT_DATE - INTERVAL '90 days'",
        'year': "CURRENT_DATE - INTERVAL '1 year'",
        'all': "CURRENT_DATE - INTERVAL '100 years'"
    };
    
    const dateFilter = periodMap[period] || periodMap['30days'];
    
    const stats = await pool.query(`
        WITH order_stats AS (
            SELECT 
                COUNT(*) FILTER (WHERE created_at >= ${dateFilter}) as new_orders,
                COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= ${dateFilter}) as completed_orders,
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount) FILTER (WHERE created_at >= ${dateFilter}), 0) as revenue,
                COALESCE(AVG(total_amount) FILTER (WHERE created_at >= ${dateFilter}), 0) as avg_order_value
            FROM orders
        ),
        customer_stats AS (
            SELECT 
                COUNT(*) FILTER (WHERE created_at >= ${dateFilter}) as new_customers,
                COUNT(*) as total_customers
            FROM customers
        ),
        fabric_stats AS (
            SELECT 
                COUNT(*) as total_fabrics,
                SUM(stock_meters) as total_stock_meters,
                COUNT(*) FILTER (WHERE stock_meters < 10) as low_stock_fabrics
            FROM fabrics
        ),
        task_stats AS (
            SELECT 
                COUNT(*) FILTER (WHERE created_at >= ${dateFilter} AND status = 'new') as new_tasks,
                COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= ${dateFilter}) as completed_tasks
            FROM tasks
        )
        SELECT 
            (SELECT * FROM order_stats),
            (SELECT * FROM customer_stats),
            (SELECT * FROM fabric_stats),
            (SELECT * FROM task_stats)
    `);
    
    const row = stats.rows[0];
    
    res.json({
        success: true,
        period,
        data: {
            orders: {
                new: parseInt(row.new_orders),
                completed: parseInt(row.completed_orders),
                total: parseInt(row.total_orders),
                conversion_rate: row.new_orders > 0 
                    ? ((row.completed_orders / row.new_orders) * 100).toFixed(1) + '%'
                    : '0%'
            },
            revenue: {
                period_revenue: parseFloat(row.revenue),
                average_order: parseFloat(row.avg_order_value).toFixed(2),
                currency: 'KZT'
            },
            customers: {
                new: parseInt(row.new_customers),
                total: parseInt(row.total_customers)
            },
            inventory: {
                total_fabrics: parseInt(row.total_fabrics),
                total_stock_meters: parseFloat(row.total_stock_meters || 0).toFixed(1),
                low_stock_alerts: parseInt(row.low_stock_fabrics)
            },
            tasks: {
                new: parseInt(row.new_tasks),
                completed: parseInt(row.completed_tasks)
            }
        }
    });
};

// ============================================
// ГРАФИК: Заказы по дням
// ============================================
export const getOrdersChart = async (req, req, res) => {
    const { days = 30 } = req.query;
    
    const result = await pool.query(`
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as orders_count,
            COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `);
    
    // Заполняем пропущенные дни нулями
    const data = fillMissingDates(result.rows, parseInt(days));
    
    res.json({
        success: true,
        data
    });
};

// ============================================
// ГРАФИК: Выручка по месяцам
// ============================================
export const getRevenueChart = async (req, res) => {
    const result = await pool.query(`
        SELECT 
            TO_CHAR(created_at, 'YYYY-MM') as month,
            COUNT(*) as orders_count,
            COALESCE(SUM(total_amount), 0) as revenue
        FROM orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month ASC
    `);
    
    res.json({
        success: true,
        data: result.rows.map(row => ({
            month: row.month,
            orders: parseInt(row.orders_count),
            revenue: parseFloat(row.revenue)
        }))
    });
};

// ============================================
// ГРАФИК: Статусы заказов
// ============================================
export const getOrderStatusStats = async (req, res) => {
    const result = await pool.query(`
        SELECT 
            status,
            COUNT(*) as count,
            COALESCE(SUM(total_amount), 0) as value
        FROM orders
        GROUP BY status
        ORDER BY count DESC
    `);
    
    const statusLabels = {
        'new': 'Новые',
        'measurement': 'Замер',
        'quote': 'Смета',
        'approved': 'Подтверждён',
        'procurement': 'В закупе',
        'production': 'Производство',
        'ready': 'Готов',
        'installed': 'Установлен',
        'completed': 'Завершён',
        'cancelled': 'Отменён'
    };
    
    res.json({
        success: true,
        data: result.rows.map(row => ({
            status: row.status,
            label: statusLabels[row.status] || row.status,
            count: parseInt(row.count),
            value: parseFloat(row.value)
        }))
    });
};

// ============================================
// ТОП тканей
// ============================================
export const getTopFabrics = async (req, res) => {
    const { limit = 10 } = req.query;
    
    const result = await pool.query(`
        SELECT 
            f.id,
            f.name,
            f.supplier,
            f.price_per_meter,
            COUNT(DISTINCT oi.order_id) as times_ordered,
            COALESCE(SUM(oi.quantity), 0) as total_meters_sold,
            COALESCE(SUM(oi.total_price), 0) as total_revenue
        FROM fabrics f
        LEFT JOIN order_items oi ON oi.fabric_id = f.id AND oi.item_type = 'fabric'
        GROUP BY f.id, f.name, f.supplier, f.price_per_meter
        ORDER BY total_meters_sold DESC
        LIMIT $1
    `, [limit]);
    
    res.json({
        success: true,
        data: result.rows.map(row => ({
            id: row.id,
            name: row.name,
            supplier: row.supplier,
            price: parseFloat(row.price_per_meter),
            orders_count: parseInt(row.times_ordered),
            meters_sold: parseFloat(row.total_meters_sold || 0).toFixed(1),
            revenue: parseFloat(row.total_revenue || 0)
        }))
    });
};

// ============================================
// ТОП клиентов
// ============================================
export const getTopCustomers = async (req, res) => {
    const { limit = 10 } = req.query;
    
    const result = await pool.query(`
        SELECT 
            c.id,
            c.full_name,
            c.email,
            c.phone,
            COUNT(o.id) as orders_count,
            COALESCE(SUM(o.total_amount), 0) as total_spent,
            MAX(o.created_at) as last_order_date
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        GROUP BY c.id, c.full_name, c.email, c.phone
        HAVING COUNT(o.id) > 0
        ORDER BY total_spent DESC
        LIMIT $1
    `, [limit]);
    
    res.json({
        success: true,
        data: result.rows.map(row => ({
            id: row.id,
            name: row.full_name,
            email: row.email,
            phone: row.phone,
            orders_count: parseInt(row.orders_count),
            total_spent: parseFloat(row.total_spent),
            last_order: row.last_order_date
        }))
    });
};

// ============================================
// Активность сотрудников
// ============================================
export const getEmployeeActivity = async (req, res) => {
    const { days = 30 } = req.query;
    
    const result = await pool.query(`
        SELECT 
            u.id,
            u.full_name,
            u.role,
            COUNT(DISTINCT o.id) as orders_created,
            COUNT(DISTINCT t.id) as tasks_completed,
            COALESCE(SUM(o.total_amount), 0) as revenue_generated
        FROM users u
        LEFT JOIN orders o ON o.customer_id IN (
            SELECT id FROM customers WHERE created_by = u.id
        ) AND o.created_at >= CURRENT_DATE - INTERVAL '${days} days'
        LEFT JOIN tasks t ON t.assigned_to = u.id 
            AND t.status = 'completed' 
            AND t.updated_at >= CURRENT_DATE - INTERVAL '${days} days'
        WHERE u.is_active = TRUE
        GROUP BY u.id, u.full_name, u.role
        ORDER BY orders_created DESC
    `);
    
    res.json({
        success: true,
        data: result.rows.map(row => ({
            id: row.id,
            name: row.full_name,
            role: row.role,
            orders_created: parseInt(row.orders_created),
            tasks_completed: parseInt(row.tasks_completed),
            revenue: parseFloat(row.revenue_generated || 0)
        }))
    });
};

// ============================================
// АЛЕРТЫ И УВЕДОМЛЕНИЯ
// ============================================
export const getAlerts = async (req, res) => {
    // Заказы без движения более 7 дней
    const stalledOrders = await pool.query(`
        SELECT id, order_number, status, created_at, updated_at
        FROM orders
        WHERE status NOT IN ('completed', 'cancelled')
          AND updated_at < NOW() - INTERVAL '7 days'
        ORDER BY updated_at ASC
        LIMIT 10
    `);
    
    // Ткани с низким запасом
    const lowStock = await pool.query(`
        SELECT id, name, stock_meters, min_stock_alert
        FROM fabrics
        WHERE stock_meters < COALESCE(min_stock_alert, 10)
        ORDER BY stock_meters ASC
        LIMIT 10
    `);
    
    // Неоплаченные заказы
    const unpaidOrders = await pool.query(`
        SELECT o.id, o.order_number, o.total_amount, o.status, c.full_name as customer
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN payments p ON p.order_id = o.id AND p.payment_type = 'prepayment'
        WHERE o.status IN ('approved', 'procurement', 'production')
          AND p.id IS NULL
        ORDER BY o.created_at DESC
        LIMIT 10
    `);
    
    res.json({
        success: true,
        alerts: {
            stalled_orders: {
                count: stalledOrders.rows.length,
                items: stalledOrders.rows
            },
            low_stock: {
                count: lowStock.rows.length,
                items: lowStock.rows
            },
            unpaid_orders: {
                count: unpaidOrders.rows.length,
                items: unpaidOrders.rows
            }
        }
    });
};

// ============================================
// ВСЕГО В ОДНОМ
// ============================================
export const getFullDashboard = async (req, res) => {
    const { period = '30days' } = req.query;
    
    // Запускаем все запросы параллельно
    const [stats, statusStats, topFabrics, topCustomers, alerts] = await Promise.all([
        getDashboardStatsData(period),
        getOrderStatusStatsData(),
        getTopFabricsData(5),
        getTopCustomersData(5),
        getAlertsData()
    ]);
    
    res.json({
        success: true,
        generated_at: new Date().toISOString(),
        stats,
        charts: {
            order_status: statusStats
        },
        top: {
            fabrics: topFabrics,
            customers: topCustomers
        },
        alerts
    });
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (для параллельных запросов)
// ============================================
const getDashboardStatsData = async (period) => {
    const dateFilter = period === '7days' ? "7 days" : 
                       period === '90days' ? "90 days" : "30 days";
    
    const result = await pool.query(`
        SELECT 
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '${dateFilter}') as new_orders,
            COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '${dateFilter}'), 0) as revenue
        FROM orders
    `);
    
    return {
        new_orders: parseInt(result.rows[0].new_orders),
        revenue: parseFloat(result.rows[0].revenue)
    };
};

const getOrderStatusStatsData = async () => {
    const result = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM orders
        GROUP BY status
    `);
    
    const labels = {
        'new': 'Новые', 'measurement': 'Замер', 'quote': 'Смета',
        'approved': 'Подтверждён', 'production': 'Производство',
        'ready': 'Готов', 'completed': 'Завершён', 'cancelled': 'Отменён'
    };
    
    return result.rows.map(r => ({
        status: r.status,
        label: labels[r.status] || r.status,
        count: parseInt(r.count)
    }));
};

const getTopFabricsData = async (limit) => {
    const result = await pool.query(`
        SELECT f.name, SUM(oi.quantity) as sold
        FROM fabrics f
        JOIN order_items oi ON oi.fabric_id = f.id
        GROUP BY f.id, f.name
        ORDER BY sold DESC
        LIMIT $1
    `, [limit]);
    
    return result.rows;
};

const getTopCustomersData = async (limit) => {
    const result = await pool.query(`
        SELECT c.full_name, COUNT(o.id) as orders, SUM(o.total_amount) as spent
        FROM customers c
        JOIN orders o ON o.customer_id = c.id
        GROUP BY c.id, c.full_name
        ORDER BY spent DESC
        LIMIT $1
    `, [limit]);
    
    return result.rows.map(r => ({
        name: r.full_name,
        orders: parseInt(r.orders),
        spent: parseFloat(r.spent)
    }));
};

const getAlertsData = async () => {
    const [lowStock, stalled] = await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM fabrics WHERE stock_meters < 10`),
        pool.query(`SELECT COUNT(*) as count FROM orders WHERE status NOT IN ('completed', 'cancelled') AND updated_at < NOW() - INTERVAL '7 days'`)
    ]);
    
    return {
        low_stock: parseInt(lowStock.rows[0].count),
        stalled_orders: parseInt(stalled.rows[0].count)
    };
};

const fillMissingDates = (data, days) => {
    const result = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const existing = data.find(d => d.date === dateStr);
        result.push({
            date: dateStr,
            orders_count: existing ? parseInt(existing.orders_count) : 0,
            revenue: existing ? parseFloat(existing.revenue) : 0
        });
    }
    
    return result;
};
