// ============================================
// СОЗДАНИЕ ВСЕХ ТЕСТОВЫХ ДАННЫХ
// Запуск: node seed-all-test-data.js
// ============================================
import bcrypt from 'bcryptjs';
import pool from './config/db.js';

const TEST_USERS = [
    { email: 'admin@test.com', full_name: 'Администратор Тестовый', role: 'admin', phone: '+77001111111' },
    { email: 'manager@test.com', full_name: 'Менеджер Тестовый', role: 'manager', phone: '+77002222222' },
    { email: 'designer@test.com', full_name: 'Дизайнер Тестовый', role: 'designer', phone: '+77003333333' },
    { email: 'seamstress@test.com', full_name: 'Швея Тестовая', role: 'seamstress', phone: '+77004444444' },
    { email: 'installer@test.com', full_name: 'Установщик Тестовый', role: 'installer', phone: '+77005555555' },
    { email: 'warehouse@test.com', full_name: 'Кладовщик Тестовый', role: 'warehouse', phone: '+77006666666' },
    { email: 'purchaser@test.com', full_name: 'Закупщик Тестовый', role: 'purchaser', phone: '+77007777777' },
];

const TEST_CUSTOMERS = [
    { full_name: 'Иванов Иван Иванович', phone: '+77011234567', email: 'ivan@example.com', address: 'ул. Ленина, 1', source: 'website' },
    { full_name: 'Петрова Мария Сергеевна', phone: '+77022345678', email: 'maria@example.com', address: 'ул. Абая, 15', source: 'instagram' },
    { full_name: 'Сидоров Алексей Петрович', phone: '+77033456789', email: 'alex@example.com', address: 'пр. Назарбаева, 45', source: 'walk_in' },
];

const PASSWORD = 'test123';

async function seedUsers() {
    console.log('👥 Создание тестовых пользователей...\n');
    
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(PASSWORD, saltRounds);
    
    for (const user of TEST_USERS) {
        try {
            // Проверяем существование
            const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
            
            if (existing.rows.length > 0) {
                console.log(`⚠️  ${user.email} уже существует`);
                continue;
            }
            
            // Создаём пользователя
            const result = await pool.query(
                `INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
                 VALUES ($1, $2, $3, $4, $5, true, NOW())
                 RETURNING id`,
                [user.email, passwordHash, user.full_name, user.role, user.phone]
            );
            
            console.log(`✅ ${user.role.padEnd(12)} | ${user.email.padEnd(20)} | ${user.full_name}`);
            
        } catch (err) {
            console.error(`❌ Ошибка создания ${user.email}:`, err.message);
        }
    }
}

async function seedCustomers() {
    console.log('\n📋 Создание тестовых клиентов...\n');
    
    for (const customer of TEST_CUSTOMERS) {
        try {
            // Проверяем существование по телефону
            const existing = await pool.query('SELECT id FROM customers WHERE phone = $1', [customer.phone]);
            
            if (existing.rows.length > 0) {
                console.log(`⚠️  ${customer.phone} уже существует`);
                continue;
            }
            
            await pool.query(
                `INSERT INTO customers (full_name, phone, email, address, source, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [customer.full_name, customer.phone, customer.email, customer.address, customer.source]
            );
            
            console.log(`✅ ${customer.full_name.padEnd(25)} | ${customer.phone}`);
            
        } catch (err) {
            console.error(`❌ Ошибка создания клиента:`, err.message);
        }
    }
}

async function printSummary() {
    console.log('\n========================================');
    console.log('✅ ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ!');
    console.log('========================================\n');
    
    console.log('🔐 Данные для входа (все роли):');
    console.log('   Пароль: test123\n');
    
    for (const user of TEST_USERS) {
        console.log(`   ${user.role.padEnd(12)} ${user.email.padEnd(25)} ${user.full_name}`);
    }
    
    console.log('\n📋 Тестовые клиенты созданы');
    console.log('📦 Теперь можно создавать заказы и тестировать API\n');
}

async function main() {
    try {
        await seedUsers();
        await seedCustomers();
        await printSummary();
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        await pool.end();
    }
}

main();
