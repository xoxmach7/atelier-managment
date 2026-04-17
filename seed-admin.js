// ============================================
// СОЗДАНИЕ ТЕСТОВОГО АДМИНА
// Запуск: node seed-admin.js
// ============================================
import bcrypt from 'bcryptjs';
import pool from './config/db.js';

const ADMIN_DATA = {
    email: 'admin@test.com',
    password: 'admin123',
    full_name: 'Админ Тестовый',
    role: 'admin',
    phone: '+77000000000'
};

async function createAdmin() {
    try {
        console.log('🔑 Создание тестового администратора...\n');
        
        // Проверяем существование
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [ADMIN_DATA.email]
        );
        
        if (existing.rows.length > 0) {
            console.log('⚠️  Пользователь уже существует');
            console.log('📧 Email:', ADMIN_DATA.email);
            console.log('🔒 Пароль:', ADMIN_DATA.password);
            console.log('\n✅ Можно использовать для входа');
            process.exit(0);
        }
        
        // Хешируем пароль
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(ADMIN_DATA.password, saltRounds);
        
        // Создаём админа
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, phone, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, true, NOW())
             RETURNING id, email, full_name, role`,
            [ADMIN_DATA.email, passwordHash, ADMIN_DATA.full_name, ADMIN_DATA.role, ADMIN_DATA.phone]
        );
        
        const user = result.rows[0];
        
        console.log('✅ Администратор создан успешно!\n');
        console.log('📧 Email:', ADMIN_DATA.email);
        console.log('🔒 Пароль:', ADMIN_DATA.password);
        console.log('👤 Имя:', user.full_name);
        console.log('🎭 Роль:', user.role);
        console.log('🆔 ID:', user.id);
        console.log('\n🚀 Готово к использованию!');
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

createAdmin();
