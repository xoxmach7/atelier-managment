// ============================================
// КОНТРОЛЛЕР СМЕТ/КП (Этап 3)
// Калькулятор + формирование коммерческого предложения
// ============================================
import pool, { withTransaction } from '../config/db.js';
import { ApiError } from '../middleware/errorHandler.js';

// Генерация номера КП
const generateQuoteNumber = async (client) => {
    const year = new Date().getFullYear();
    const result = await client.query(
        `SELECT COUNT(*) FROM quotes WHERE quote_number LIKE $1`,
        [`КП-${year}-%`]
    );
    const count = parseInt(result.rows[0].count) + 1;
    return `КП-${year}-${String(count).padStart(3, '0')}`;
};

// Калькулятор полной сметы с учётом сложности и фурнитуры
export const calculateMaterials = async (req, res) => {
    const { window_width_cm, window_height_cm, folds_count = 2, 
            fabric_width_cm, fabric_id, sewing_type,
            city = 'Алматы', installation = false, delivery = false,
            complexity = 'medium', accessories = [], cornice_id } = req.body;
    
    if (!window_width_cm || !window_height_cm) {
        throw new ApiError(400, 'Укажите ширину и высоту окна');
    }
    
    // Коэффициенты сложности пошива (в тенге за метр)
    const complexityRates = {
        'simple': 2000,      // Простой (прямые шторы)
        'medium': 3500,    // Средний (с подхватами, бахромой)
        'complex': 5500,   // Сложный (ламбрекены, фестоны)
        'premium': 8000    // Премиум (ручная вышивка, кружево)
    };
    
    // Стандартная фурнитура (крючки, кольца, подхваты)
    const defaultAccessoriesCost = 2500;
    
    // Получаем данные ткани
    let fabricWidth = fabric_width_cm;
    let fabricPrice = 0;
    let fabricName = null;
    
    if (fabric_id) {
        const fabricResult = await pool.query(
            'SELECT width_cm, price_per_meter, name FROM fabrics WHERE id = $1',
            [fabric_id]
        );
        if (fabricResult.rows.length > 0) {
            fabricWidth = fabricResult.rows[0].width_cm;
            fabricPrice = fabricResult.rows[0].price_per_meter;
            fabricName = fabricResult.rows[0].name;
        }
    }
    
    if (!fabricWidth) {
        throw new ApiError(400, 'Укажите ширину ткани');
    }
    
    // Расчёт пошива штор
    // Коэффициент сборки (обычно 2-2.5 для штор, 1.5-2 для тюля)
    const gatheringRatio = sewing_type === 'тюль' ? 2.0 : 2.2;
    
    // Ширина ткани = ширина окна * коэффициент
    const fabricWidthNeeded = (window_width_cm * gatheringRatio) / 100; // в метрах
    
    // Высота + припуски (10см сверху на подгиб, 15см снизу)
    const fabricHeightNeeded = (window_height_cm + 25) / 100; // в метрах
    
    // Если ткань уже нужной ширины (обычно 280-320см) и это достаточно для высоты
    // то берём одно полотно. Если нет — считаем количество полотен
    let panels = 1;
    let totalMeters = fabricHeightNeeded;
    
    // Если ткань не широкая или нужна горизонтальная компоновка
    if (fabricWidth < window_width_cm * 1.5) {
        panels = Math.ceil(window_width_cm / fabricWidth);
        totalMeters = fabricHeightNeeded * panels;
    }
    
    // Припуск на складки
    if (folds_count > 0) {
        totalMeters *= (1 + (folds_count * 0.02)); // +2% на каждую складку
    }
    
    // Округляем до 0.1м
    totalMeters = Math.ceil(totalMeters * 10) / 10;
    
    const fabricCost = totalMeters * fabricPrice;
    
    // Расчёт стоимости пошива
    const sewingRate = complexityRates[complexity] || complexityRates['medium'];
    const sewingCost = totalMeters * sewingRate;
    
    // Расчёт фурнитуры
    const accessoriesCost = accessories.length > 0 
        ? accessories.reduce((sum, a) => sum + (a.price * a.quantity), 0)
        : defaultAccessoriesCost;
    
    // Расчёт услуг для Казахстана (в тенге)
    const cityRates = {
        'Алматы': { installation: 15000, delivery: 5000 },
        'Астана': { installation: 18000, delivery: 6000 },
        'Шымкент': { installation: 14000, delivery: 4500 },
        'Другой': { installation: 20000, delivery: 8000 },
    };
    
    const rates = cityRates[city] || cityRates['Алматы'];
    const installationCost = installation ? rates.installation : 0;
    const deliveryCost = delivery ? rates.delivery : 0;
    
    // ИТОГО: Ткань + Пошив + Фурнитура + Монтаж + Доставка
    const totalCost = fabricCost + sewingCost + accessoriesCost + installationCost + deliveryCost;
    const prepaymentAmount = totalCost * 0.5; // 50% предоплата
    
    res.json({
        success: true,
        data: {
            window_width_cm,
            window_height_cm,
            fabric_name: fabricName,
            fabric_width_cm: fabricWidth,
            fabric_price: fabricPrice,
            gathering_ratio: gatheringRatio,
            panels_needed: panels,
            meters_needed: totalMeters,
            fabric_cost: fabricCost,
            sewing_type: sewing_type || 'шторы',
            complexity,
            sewing_cost: sewingCost,
            sewing_rate: sewingRate,
            accessories_cost: accessoriesCost,
            city,
            installation,
            delivery,
            installation_cost: installationCost,
            delivery_cost: deliveryCost,
            total_cost: totalCost,
            prepayment_amount: prepaymentAmount,
            breakdown: {
                fabric: fabricCost,
                sewing: sewingCost,
                accessories: accessoriesCost,
                installation: installationCost,
                delivery: deliveryCost
            }
        }
    });
};

// Получить сметы задачи
export const getQuotes = async (req, res) => {
    const { task_id, status, limit = 50 } = req.query;
    
    let query = `
        SELECT q.*, 
               t.task_number, t.client_name,
               u.full_name as created_by_name,
               (SELECT COUNT(*) FROM quote_items WHERE quote_id = q.id) as items_count
        FROM quotes q
        JOIN tasks t ON q.task_id = t.id
        LEFT JOIN users u ON q.created_by = u.id
        WHERE 1=1
    `;
    const params = [];
    
    if (task_id) {
        query += ` AND q.task_id = $${params.length + 1}`;
        params.push(task_id);
    }
    
    if (status) {
        query += ` AND q.status = $${params.length + 1}`;
        params.push(status);
    }
    
    query += ` ORDER BY q.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
};

// Получить одну смету с позициями
export const getQuoteById = async (req, res) => {
    const { id } = req.params;
    
    const quoteResult = await pool.query(
        `SELECT q.*, t.task_number, t.client_name, t.client_phone
         FROM quotes q
         JOIN tasks t ON q.task_id = t.id
         WHERE q.id = $1`,
        [id]
    );
    
    if (quoteResult.rows.length === 0) {
        throw new ApiError(404, 'Смета не найдена');
    }
    
    const quote = quoteResult.rows[0];
    
    // Позиции
    const itemsResult = await pool.query(
        `SELECT qi.*,
                f.name as fabric_name, f.hanger_number,
                c.name as cornice_name, c.sku as cornice_sku,
                s.name as service_name
         FROM quote_items qi
         LEFT JOIN fabrics f ON qi.fabric_id = f.id
         LEFT JOIN cornices c ON qi.cornice_id = c.id
         LEFT JOIN services s ON qi.service_id = s.id
         WHERE qi.quote_id = $1
         ORDER BY qi.sort_order`,
        [id]
    );
    
    res.json({
        success: true,
        data: {
            ...quote,
            items: itemsResult.rows
        }
    });
};

// Создать смету
export const createQuote = async (req, res) => {
    const { task_id, items, valid_until, estimated_days, internal_notes } = req.body;
    
    const result = await withTransaction(async (client) => {
        // Проверяем задачу
        const taskCheck = await client.query(
            'SELECT id, status, client_name, client_phone FROM tasks WHERE id = $1',
            [task_id]
        );
        
        if (taskCheck.rows.length === 0) {
            throw new ApiError(404, 'Задача не найдена');
        }
        
        const task = taskCheck.rows[0];
        
        // Генерируем номер
        const quoteNumber = await generateQuoteNumber(client);
        
        // Рассчитываем суммы по категориям
        let fabricsTotal = 0;
        let cornicesTotal = 0;
        let servicesTotal = 0;
        
        // Создаём смету
        const quoteResult = await client.query(
            `INSERT INTO quotes (quote_number, task_id, status, valid_until, 
             estimated_days, internal_notes, created_by)
             VALUES ($1, $2, 'draft', $3, $4, $5, $6) RETURNING *`,
            [quoteNumber, task_id, valid_until, estimated_days, internal_notes, req.user?.id]
        );
        
        const quote = quoteResult.rows[0];
        
        // Добавляем позиции
        if (items && items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const { item_type, fabric_id, cornice_id, service_id, 
                        quantity, unit_price, sewing_type, 
                        window_width_cm, window_height_cm } = item;
                
                const description = item.description || await getItemDescription(item);
                const totalPrice = quantity * unit_price * (1 - (item.discount_percent || 0) / 100);
                
                await client.query(
                    `INSERT INTO quote_items (quote_id, item_type, fabric_id, cornice_id, service_id,
                     description, quantity, unit_price, total_price, sewing_type,
                     window_width_cm, window_height_cm, sort_order)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [quote.id, item_type, fabric_id || null, cornice_id || null, service_id || null,
                     description, quantity, unit_price, totalPrice, sewing_type,
                     window_width_cm || null, window_height_cm || null, i]
                );
                
                // Суммируем по категориям
                if (item_type === 'fabric') fabricsTotal += parseFloat(totalPrice);
                else if (item_type === 'cornice') cornicesTotal += parseFloat(totalPrice);
                else if (item_type === 'service') servicesTotal += parseFloat(totalPrice);
            }
        }
        
        const totalAmount = fabricsTotal + cornicesTotal + servicesTotal;
        
        // Обновляем итоги
        await client.query(
            `UPDATE quotes SET 
             fabrics_total = $1, cornices_total = $2, services_total = $3, total_amount = $4
             WHERE id = $5`,
            [fabricsTotal, cornicesTotal, servicesTotal, totalAmount, quote.id]
        );
        
        // Обновляем статус задачи
        await client.query(
            `UPDATE tasks SET status = 'quote_preparing', updated_at = NOW() WHERE id = $1`,
            [task_id]
        );
        
        // Логируем
        await client.query(
            `INSERT INTO task_history (task_id, action, new_value, performed_by, notes)
             VALUES ($1, 'quote_created', $2, $3, $4)`,
            [task_id, JSON.stringify({ quote_number: quoteNumber, total: totalAmount }),
             req.user?.id, `Создана смета ${quoteNumber} на сумму ${totalAmount}`]
        );
        
        return {
            ...quote,
            fabrics_total: fabricsTotal,
            cornices_total: cornicesTotal,
            services_total: servicesTotal,
            total_amount: totalAmount
        };
    });
    
    res.status(201).json({ success: true, data: result });
};

// Отправить КП клиенту
export const sendQuote = async (req, res) => {
    const { id } = req.params;
    const { send_via, send_to } = req.body;
    
    const result = await pool.query(
        `UPDATE quotes 
         SET status = 'sent', sent_via = $1, sent_to = $2, sent_at = NOW()
         WHERE id = $3 RETURNING *`,
        [send_via, send_to, id]
    );
    
    if (result.rows.length === 0) {
        throw new ApiError(404, 'Смета не найдена');
    }
    
    // Обновляем статус задачи
    await pool.query(
        `UPDATE tasks SET status = 'quote_sent', updated_at = NOW() 
         WHERE id = (SELECT task_id FROM quotes WHERE id = $1)`,
        [id]
    );
    
    res.json({ 
        success: true, 
        message: `КП отправлено через ${send_via} на ${send_to}`,
        data: result.rows[0] 
    });
};

// Клиент согласовал КП → конвертируем в заказ
export const approveQuote = async (req, res) => {
    const { id } = req.params;
    
    const result = await withTransaction(async (client) => {
        // Получаем смету
        const quoteResult = await client.query(
            'SELECT * FROM quotes WHERE id = $1',
            [id]
    );
        
        if (quoteResult.rows.length === 0) {
            throw new ApiError(404, 'Смета не найдена');
        }
        
        const quote = quoteResult.rows[0];
        
        if (quote.status !== 'sent') {
            throw new ApiError(400, 'КП должно быть отправлено перед согласованием');
        }
        
        // Получаем позиции
        const itemsResult = await client.query(
            'SELECT * FROM quote_items WHERE quote_id = $1',
            [id]
        );
        
        // Получаем данные задачи
        const taskResult = await client.query(
            'SELECT * FROM tasks WHERE id = $1',
            [quote.task_id]
        );
        const task = taskResult.rows[0];
        
        // Создаём клиента если не был создан
        let customerId = task.customer_id;
        if (!customerId) {
            const customerResult = await client.query(
                `INSERT INTO customers (full_name, phone, address) 
                 VALUES ($1, $2, $3) RETURNING id`,
                [task.client_name, task.client_phone, task.client_address]
            );
            customerId = customerResult.rows[0].id;
        }
        
        // Здесь должно быть создание заказа...
        // Для примера просто обновляем статус сметы
        await client.query(
            `UPDATE quotes SET status = 'approved' WHERE id = $1`,
            [id]
        );
        
        // Обновляем задачу
        await client.query(
            `UPDATE tasks SET status = 'converted_to_order', updated_at = NOW() WHERE id = $1`,
            [quote.task_id]
        );
        
        return {
            quote_id: id,
            task_id: quote.task_id,
            customer_id: customerId,
            items_count: itemsResult.rows.length
        };
    });
    
    res.json({ 
        success: true, 
        message: 'КП согласовано, готово к созданию заказа',
        data: result 
    });
};

// Хелпер для получения описания позиции
async function getItemDescription(item) {
    const { item_type, fabric_id, cornice_id, service_id } = item;
    
    if (item_type === 'fabric' && fabric_id) {
        const result = await pool.query('SELECT name FROM fabrics WHERE id = $1', [fabric_id]);
        return result.rows[0]?.name || 'Ткань';
    }
    if (item_type === 'cornice' && cornice_id) {
        const result = await pool.query('SELECT name FROM cornices WHERE id = $1', [cornice_id]);
        return result.rows[0]?.name || 'Карниз';
    }
    if (item_type === 'service' && service_id) {
        const result = await pool.query('SELECT name FROM services WHERE id = $1', [service_id]);
        return result.rows[0]?.name || 'Услуга';
    }
    return 'Позиция';
}
