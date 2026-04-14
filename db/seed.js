// ============================================
// СКРИПТ ЗАПОЛНЕНИЯ ТЕСТОВЫМИ ДАННЫМИ
// ============================================
import pool from '../config/db.js';

const seedData = async () => {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        console.log('🌱 Начинаю заполнение тестовыми данными...\n');

        // 1. Услуги
        const services = [
            ['Пошив штор', 'Профессиональный пошив штор любой сложности', 'метр', 1500],
            ['Пошив тюля', 'Пошив тюлевых занавесок', 'метр', 800],
            ['Установка карниза', 'Монтаж карниза включая крепления', 'штука', 2500],
            ['Выезд на замер', 'Замерщик с образцами тканей', 'выезд', 1500],
            ['Установка штор', 'Навеска готовых штор', 'окно', 1000],
        ];
        
        for (const s of services) {
            await client.query(
                `INSERT INTO services (name, description, unit, price_per_unit) 
                 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
                s
            );
        }
        console.log('✅ Услуги добавлены');

        // 2. Ткани
        const fabrics = [
            ['A-101', 'Бархат Royal Blue', '100% Polyester', 280, 25.5, 4500, 'Синий', 'Однотонный', 'Турция'],
            ['B-205', 'Лен Натуральный Grey', '80% Linen, 20% Cotton', 300, 15.0, 6800, 'Серый', 'Однотонный', 'Италия'],
            ['C-303', 'Блэкаут Ultra Beige', '100% Blackout', 290, 40.0, 3200, 'Бежевый', 'Однотонный', 'Китай'],
            ['D-401', 'Тюль Вуаль White', '100% Polyester', 320, 50.0, 1800, 'Белый', 'Однотонный', 'Турция'],
            ['E-502', 'Шенилл Soft Touch', '100% Polyester', 145, 12.0, 8900, 'Кремовый', 'Фактурный', 'Германия'],
            ['F-610', 'Рогожка Loft Style', '100% Cotton', 150, 30.0, 5500, 'Коричневый', 'Рогожка', 'Россия'],
            ['G-701', 'Шёлк Premium Gold', '100% Silk', 140, 8.5, 15000, 'Золотой', 'Гладкий', 'Италия'],
            ['H-802', 'Лён Printed Floral', '100% Linen', 280, 20.0, 7200, 'Зелёный', 'Цветочный', 'Италия'],
        ];
        
        for (const f of fabrics) {
            await client.query(
                `INSERT INTO fabrics (hanger_number, name, composition, width_cm, stock_meters, 
                 price_per_meter, color, pattern, supplier) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
                f
            );
        }
        console.log('✅ Ткани добавлены');

        // 3. Карнизы
        const cornices = [
            ['CRN-001', 'Потолочный алюминий 2м', 'потолочный', 'алюминий', 'белый', 200, 15, 10, 3500],
            ['CRN-002', 'Потолочный алюминий 3м', 'потолочный', 'алюминий', 'белый', 300, 15, 8, 4500],
            ['CRN-003', 'Настенный металл 2м', 'настенный', 'металл', 'золото', 200, 20, 15, 5200],
            ['CRN-004', 'Настенный металл 3м', 'настенный', 'металл', 'хром', 300, 20, 12, 6800],
            ['CRN-005', 'Электрокарниз 3м', 'электрический', 'алюминий', 'белый', 300, 25, 5, 25000],
            ['CRN-006', 'Карниз багет 2м', 'багетный', 'пластик', 'орех', 200, 10, 20, 2800],
        ];
        
        for (const c of cornices) {
            await client.query(
                `INSERT INTO cornices (sku, name, type, material, color, length_cm, 
                 max_load_kg, stock_count, price) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
                c
            );
        }
        console.log('✅ Карнизы добавлены');

        // 4. Клиент
        const customerResult = await client.query(
            `INSERT INTO customers (full_name, phone, email, address, notes)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            ['Иванова Мария Петровна', '+7(999)123-45-67', 'maria@example.com', 
             'г. Москва, ул. Ленина 10, кв. 25', 'Предпочитает натуральные ткани']
        );
        const customerId = customerResult.rows[0].id;
        console.log('✅ Тестовый клиент добавлен');

        // 5. Заказ
        const orderResult = await client.query(
            `INSERT INTO orders (order_number, customer_id, installation_address, 
             status, measurement_date, planned_completion, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            ['О-2024-001', customerId, 'г. Москва, ул. Ленина 10, кв. 25', 
             'design', '2024-01-15', '2024-02-01', 'Срочный заказ']
        );
        const orderId = orderResult.rows[0].id;
        console.log('✅ Тестовый заказ добавлен');

        // 6. Позиции заказа
        const orderItems = [
            // Портьеры из бархата
            [orderId, 'fabric', 1, null, null, 6, 4500, 27000, 'шторы', 300, 250, 2],
            // Тюль
            [orderId, 'fabric', null, null, 4, 8, 1800, 14400, 'тюль', 300, 250, 2],
            // Карниз потолочный
            [orderId, 'cornice', null, 1, null, 2, 3500, 7000, null, null, null, null],
            // Установка
            [orderId, 'service', null, null, 3, 1, 2500, 2500, null, null, null, null],
            // Пошив штор
            [orderId, 'service', null, null, 1, 6, 1500, 9000, null, null, null, null],
        ];
        
        for (const item of orderItems) {
            await client.query(
                `INSERT INTO order_items (order_id, item_type, fabric_id, cornice_id, service_id,
                 quantity, unit_price, total_price, sewing_type, window_width_cm, window_height_cm, folds_count)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                item
            );
        }
        
        // Обновляем сумму заказа
        await client.query(
            `UPDATE orders SET total_amount = (SELECT SUM(total_price) FROM order_items WHERE order_id = $1)
             WHERE id = $1`,
            [orderId]
        );
        console.log('✅ Позиции заказа добавлены');

        // 7. Замеры
        const measurements = [
            [orderId, 'Гостиная', 'Большое окно', 300, 250, 15, 'потолок', 'Балконная дверь рядом'],
            [orderId, 'Гостиная', 'Балконная дверь', 120, 250, 15, 'потолок', null],
        ];
        
        for (const m of measurements) {
            await client.query(
                `INSERT INTO measurements (order_id, room_name, window_name, width_cm, height_cm, 
                 depth_cm, mounting_type, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                m
            );
        }
        console.log('✅ Замеры добавлены');

        await client.query('COMMIT');
        
        console.log('\n🎉 База данных успешно заполнена тестовыми данными!');
        console.log(`   Заказ №О-2024-001 создан для демонстрации`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Ошибка:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
};

seedData();
